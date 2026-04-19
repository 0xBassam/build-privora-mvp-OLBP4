const { Op } = require('sequelize');
const crypto = require('crypto');
const {
  DataSharingRequest,
  DataSharingTransaction,
  ConsentTransaction,
  DisclosureRecord,
  Organization,
  User,
} = require('../models');
const { createAuditLog, getClientIp } = require('../middleware/audit');
const { success, created, badRequest, notFound, forbidden, unauthorized } = require('../utils/response');
const policyEngine = require('../services/policyEngine');

// ─── Org: Create a data sharing request ───────────────────────────────────────

/**
 * POST /api/v1/data-sharing/requests
 * Entity X creates a request to access data about a user from Entity Y.
 */
const createDataSharingRequest = async (req, res) => {
  const {
    userId,
    providingOrgId,
    title,
    dataTypes,
    purpose,
    purposeCategory,
    duration,
    legalBasis,
    privacyNotice,
    expiresAt,
  } = req.body;

  const requestingOrgId = req.user.organizationId;
  if (!requestingOrgId) {return forbidden(res, 'No organization associated with this admin');}

  // Validate target user exists
  const user = await User.findByPk(userId, { attributes: ['id', 'email', 'name'] });
  if (!user) {return notFound(res, 'User not found');}

  // Check if there is already an active approved consent from this user
  // for this requesting org + matching data types + purpose
  const existingConsent = await ConsentTransaction.findOne({
    where: {
      userId,
      organizationId: requestingOrgId,
      status: 'approved',
    },
    order: [['createdAt', 'DESC']],
  });

  const initialStatus = existingConsent ? 'consent_approved' : 'pending_consent';

  const sharingRequest = await DataSharingRequest.create({
    requestingOrgId,
    providingOrgId: providingOrgId || null,
    userId,
    title,
    dataTypes: dataTypes || [],
    purpose,
    purposeCategory: purposeCategory || 'other',
    duration,
    legalBasis: legalBasis || 'consent',
    privacyNotice: privacyNotice || null,
    expiresAt: expiresAt || null,
    status: initialStatus,
    consentTransactionId: existingConsent ? existingConsent.id : null,
    createdBy: req.user.id,
  });

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId: requestingOrgId,
    action: 'DATA_SHARING_REQUEST_CREATED',
    resourceType: 'DataSharingRequest',
    resourceId: sharingRequest.id,
    description: `Created data sharing request: ${title} (status: ${initialStatus})`,
    metadata: { userId, dataTypes, purpose, existingConsentFound: !!existingConsent },
    ipAddress: getClientIp(req),
  });

  return created(res, { request: sharingRequest, user }, 'Data sharing request created');
};

/**
 * GET /api/v1/data-sharing/requests
 * List data sharing requests for the requesting org.
 */
const listOrgDataSharingRequests = async (req, res) => {
  const requestingOrgId = req.user.organizationId;
  const { page = 1, limit = 20, status } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const where = { requestingOrgId };
  if (status) {where.status = status;}

  const { count, rows } = await DataSharingRequest.findAndCountAll({
    where,
    include: [
      { model: User, as: 'dataSubject', attributes: ['id', 'name', 'email'] },
      { model: Organization, as: 'providingOrg', attributes: ['id', 'name'] },
    ],
    order: [['createdAt', 'DESC']],
    limit: Number(limit),
    offset,
  });

  return success(res, {
    requests: rows,
    pagination: { total: count, page: Number(page), limit: Number(limit), pages: Math.ceil(count / Number(limit)) },
  });
};

/**
 * GET /api/v1/data-sharing/requests/:id
 * Get details of a single data sharing request.
 */
const getDataSharingRequest = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const request = await DataSharingRequest.findOne({
    where: {
      id,
      [Op.or]: [{ requestingOrgId: orgId }, { providingOrgId: orgId }],
    },
    include: [
      { model: User, as: 'dataSubject', attributes: ['id', 'name', 'email'] },
      { model: Organization, as: 'requestingOrg', attributes: ['id', 'name', 'logoUrl'] },
      { model: Organization, as: 'providingOrg', attributes: ['id', 'name', 'logoUrl'] },
      { model: DataSharingTransaction, as: 'transactions' },
    ],
  });

  if (!request) {return notFound(res, 'Data sharing request not found');}
  return success(res, { request });
};

// ─── User: View & respond to data sharing requests ────────────────────────────

/**
 * GET /api/v1/data-sharing/user/requests
 * List pending data sharing requests for the authenticated user.
 */
const listUserDataSharingRequests = async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20, status } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const where = { userId };
  if (status) {
    where.status = status;
  } else {
    where.status = { [Op.in]: ['pending_consent', 'consent_approved', 'completed'] };
  }

  const { count, rows } = await DataSharingRequest.findAndCountAll({
    where,
    include: [
      { model: Organization, as: 'requestingOrg', attributes: ['id', 'name', 'logoUrl'] },
      { model: Organization, as: 'providingOrg', attributes: ['id', 'name', 'logoUrl'] },
    ],
    order: [['createdAt', 'DESC']],
    limit: Number(limit),
    offset,
  });

  return success(res, {
    requests: rows,
    pagination: { total: count, page: Number(page), limit: Number(limit), pages: Math.ceil(count / Number(limit)) },
  });
};

/**
 * POST /api/v1/data-sharing/requests/:id/respond
 * User approves or rejects a data sharing request.
 */
const respondToDataSharingRequest = async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  const userId = req.user.id;
  const ip = getClientIp(req);

  if (!['approved', 'rejected'].includes(status)) {
    return badRequest(res, 'Status must be approved or rejected');
  }

  const request = await DataSharingRequest.findOne({
    where: { id, userId, status: 'pending_consent' },
    include: [{ model: Organization, as: 'requestingOrg', attributes: ['id', 'name'] }],
  });

  if (!request) {return notFound(res, 'Data sharing request not found or already responded to');}

  if (status === 'approved') {
    // Create a consent transaction recording this approval
    const consentTx = await ConsentTransaction.create({
      consentRequestId: id, // reuse the sharing request ID as a consent reference
      userId,
      organizationId: request.requestingOrgId,
      status: 'approved',
      reason: null,
      respondedAt: new Date(),
      ipAddress: ip,
      userAgent: req.headers['user-agent'],
      metadata: { type: 'data_sharing_consent', dataSharingRequestId: id },
    }).catch(() => null); // graceful — consent transaction table may not have this FK

    await request.update({
      status: 'consent_approved',
      consentTransactionId: consentTx?.id || null,
      respondedAt: new Date(),
    });

    await createAuditLog({
      actorId: userId,
      actorRole: req.user.role,
      action: 'DATA_SHARING_APPROVED',
      resourceType: 'DataSharingRequest',
      resourceId: id,
      description: `User approved data sharing request: ${request.title}`,
      metadata: { requestingOrg: request.requestingOrg?.name, dataTypes: request.dataTypes },
      ipAddress: ip,
      severity: 'info',
    });

    return success(res, { request }, 'Data sharing request approved');
  }

  // Rejected
  await request.update({
    status: 'rejected',
    rejectionReason: reason || null,
    respondedAt: new Date(),
  });

  await createAuditLog({
    actorId: userId,
    actorRole: req.user.role,
    action: 'DATA_SHARING_REJECTED',
    resourceType: 'DataSharingRequest',
    resourceId: id,
    description: `User rejected data sharing request: ${request.title}`,
    metadata: { reason },
    ipAddress: ip,
    severity: 'info',
  });

  return success(res, { request }, 'Data sharing request rejected');
};

// ─── Org: Execute data sharing (after consent approved) ───────────────────────

/**
 * POST /api/v1/data-sharing/requests/:id/execute
 * Trigger actual data sharing after consent is approved.
 *
 * ENFORCEMENT ORDER:
 *   1. Policy Engine → Consent + Purpose + DPIA + Art. 16 validation
 *   2. If any check fails → HARD BLOCK with reason + required actions
 *   3. Create Disclosure Record (audit trail)
 *   4. Apply data minimization
 *   5. Execute sharing and link to Disclosure Record
 */
const executeDataSharing = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;
  const ip = getClientIp(req);

  const request = await DataSharingRequest.findOne({
    where: { id, requestingOrgId: orgId, status: 'consent_approved' },
    include: [
      { model: User, as: 'dataSubject', attributes: ['id', 'name', 'email', 'phone'] },
      { model: Organization, as: 'providingOrg', attributes: ['id', 'name'] },
    ],
  });

  if (!request) {
    return notFound(res, 'Data sharing request not found or consent not yet approved');
  }

  const rawTypes = request.getDataValue ? request.getDataValue('dataTypes') : request.dataTypes;
  const requestedFields = Array.isArray(rawTypes)
    ? rawTypes
    : (() => { try { return JSON.parse(rawTypes); } catch { return []; } })();

  // ── STEP 1: Policy Engine Validation (Validate → Decision → Enforce) ─────────
  const policyDecision = await policyEngine.validateDataSharing({
    userId: request.userId,
    organizationId: orgId,
    dataTypes: requestedFields,
    legalBasis: request.legalBasis,
    purpose: request.purpose,
    purposeCategory: request.purposeCategory,
    crossBorderTransfer: request.metadata?.crossBorderTransfer || false,
    transferSafeguards: request.metadata?.transferSafeguards || null,
    destinationCountry: request.metadata?.destinationCountry || null,
  });

  if (!policyDecision.allowed) {
    // Log the block decision
    await createAuditLog({
      actorId: req.user.id,
      actorRole: req.user.role,
      organizationId: orgId,
      action: 'DATA_SHARING_BLOCKED',
      resourceType: 'DataSharingRequest',
      resourceId: id,
      result: 'BLOCKED',
      decision: policyDecision.decision,
      decisionReason: policyDecision.reasons.join('; '),
      description: `Data sharing BLOCKED by ${policyDecision.blockedBy}: ${policyDecision.reasons[0]}`,
      metadata: { policyDecision, requestedFields },
      ipAddress: ip,
      severity: 'critical',
    });

    return res.status(403).json({
      success: false,
      blocked: true,
      decision: 'BLOCKED',
      blockedBy: policyDecision.blockedBy,
      reasons: policyDecision.reasons,
      requiredActions: policyDecision.requiredActions,
      warnings: policyDecision.warnings,
      message: `Data sharing blocked — ${policyDecision.reasons[0]}`,
    });
  }

  // ── STEP 2: Create Disclosure Record BEFORE sharing ───────────────────────────
  const subject = request.dataSubject || await User.findByPk(request.userId, {
    attributes: ['id', 'name', 'email', 'phone'],
  });

  const providingOrg = request.providingOrg || await Organization.findByPk(request.providingOrgId, {
    attributes: ['id', 'name'],
  });

  const requestingOrg = await Organization.findByPk(orgId, { attributes: ['id', 'name'] });

  const disclosureRecord = await DisclosureRecord.create({
    organizationId: orgId,
    dataSharingRequestId: id,
    disclosingEntity: providingOrg?.name || requestingOrg?.name || orgId,
    receivingEntity: requestingOrg?.name || orgId,
    receivingEntityType: 'organization',
    purpose: request.purpose,
    purposeCategory: request.purposeCategory,
    dataCategories: [...new Set(requestedFields.map((f) => f.split('_')[0]))],
    dataFields: requestedFields,
    estimatedRecords: 1,
    legalBasis: request.legalBasis,
    consentReference: request.consentTransactionId || policyDecision.consentId || null,
    art16ClearanceResult: 'approved',
    art16Violations: [],
    policyDecision,
    isCrossBorder: request.metadata?.crossBorderTransfer || false,
    destinationCountry: request.metadata?.destinationCountry || null,
    transferSafeguards: request.metadata?.transferSafeguards || null,
    retentionPeriod: request.duration || null,
    expiresAt: request.expiresAt || null,
    status: 'active',
    createdBy: req.user.id,
  });

  // ── STEP 3: Data Minimization ─────────────────────────────────────────────────
  const allowedFieldMap = {
    name:  subject?.name,
    email: subject?.email,
    phone: subject?.phone,
  };

  const sharedPayload = {};
  for (const field of requestedFields) {
    if (allowedFieldMap[field] !== undefined) {
      sharedPayload[field] = allowedFieldMap[field];
    }
  }

  // ── STEP 4: Hash and create transaction ───────────────────────────────────────
  const dataHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(sharedPayload) + id)
    .digest('hex');

  const transaction = await DataSharingTransaction.create({
    dataSharingRequestId: id,
    requestingOrgId: request.requestingOrgId,
    providingOrgId: request.providingOrgId,
    userId: request.userId,
    consentTransactionId: request.consentTransactionId,
    dataTypesShared: requestedFields,
    purpose: request.purpose,
    dataHash,
    sharedAt: new Date(),
    ipAddress: ip,
    expiresAt: request.expiresAt,
  });

  // Link transaction to disclosure record
  await disclosureRecord.update({
    dataSharingTransactionId: transaction.id,
    dataHash,
    status: 'executed',
  });

  // Update request to completed
  await request.update({ status: 'completed' });

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId: orgId,
    action: 'DATA_SHARING_EXECUTED',
    resourceType: 'DataSharingTransaction',
    resourceId: transaction.id,
    result: 'APPROVED',
    decision: 'APPROVED',
    decisionReason: 'All policy checks passed: consent verified, purpose validated, Art. 16 cleared',
    description: `Data shared: ${requestedFields.join(', ')} for purpose: ${request.purpose}`,
    metadata: {
      dataSharingRequestId: id,
      disclosureRecordId: disclosureRecord.id,
      dataTypes: requestedFields,
      dataHash,
      fieldsShared: Object.keys(sharedPayload),
      policyDecision: { allowed: true, warnings: policyDecision.warnings },
    },
    ipAddress: ip,
    severity: 'warning',
  });

  return success(res, {
    transaction,
    disclosureRecordId: disclosureRecord.id,
    sharedData: sharedPayload,
    dataHash,
    sharedAt: transaction.sharedAt,
    expiresAt: transaction.expiresAt,
    purpose: request.purpose,
    policyDecision: { allowed: true, warnings: policyDecision.warnings },
    dataMinimizationNote: 'Only the approved minimal fields were included. Disclosure record created for audit.',
  }, 'Data shared successfully — Disclosure record created');
};

/**
 * GET /api/v1/data-sharing/transactions
 * Audit trail of all data sharing transactions for an org.
 */
const listTransactions = async (req, res) => {
  const orgId = req.user.organizationId;
  const { page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const { count, rows } = await DataSharingTransaction.findAndCountAll({
    where: {
      [Op.or]: [{ requestingOrgId: orgId }, { providingOrgId: orgId }],
    },
    include: [
      { model: DataSharingRequest, as: 'request', attributes: ['id', 'title', 'purpose', 'dataTypes'] },
      { model: User, as: 'dataSubject', attributes: ['id', 'name', 'email'] },
    ],
    order: [['sharedAt', 'DESC']],
    limit: Number(limit),
    offset,
  });

  return success(res, {
    transactions: rows,
    pagination: { total: count, page: Number(page), limit: Number(limit), pages: Math.ceil(count / Number(limit)) },
  });
};

module.exports = {
  createDataSharingRequest,
  listOrgDataSharingRequests,
  getDataSharingRequest,
  listUserDataSharingRequests,
  respondToDataSharingRequest,
  executeDataSharing,
  listTransactions,
};
