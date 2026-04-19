const { Op } = require('sequelize');
const { DsarRequest, Organization, User } = require('../models');
const { createAuditLog, getClientIp } = require('../middleware/audit');
const { success, created, badRequest, notFound, forbidden } = require('../utils/response');
const policyEngine = require('../services/policyEngine');

const SLA_DAYS = 30; // PDPL Art. 4 — 30-day response window

// ── Case ID generator: PDPL-YYYY-NNNNN ──────────────────────────────────────
async function generateCaseId() {
  const year = new Date().getFullYear();
  const prefix = `PDPL-${year}-`;

  const count = await DsarRequest.count({
    where: { caseId: { [Op.like]: `${prefix}%` } },
  });

  const seq = String(count + 1).padStart(5, '0');
  return `${prefix}${seq}`;
}

// ─── User: Submit a DSAR ──────────────────────────────────────────────────────

/**
 * POST /api/v1/dsar/requests
 * Data subject submits a new DSAR to an organization.
 */
const submitDsarRequest = async (req, res) => {
  const { organizationId, requestType, description } = req.body;
  const userId = req.user.id;
  const ip = getClientIp(req);

  const org = await Organization.findByPk(organizationId, { attributes: ['id', 'name'] });
  if (!org) {return notFound(res, 'Organization not found');}

  // Prevent duplicate open requests of same type
  const existing = await DsarRequest.findOne({
    where: {
      userId,
      organizationId,
      requestType,
      status: { [Op.in]: ['pending', 'in_progress'] },
    },
  });
  if (existing) {
    return badRequest(res, `You already have an open ${requestType} request (${existing.caseId}) with this organization`);
  }

  const slaDeadline = new Date();
  slaDeadline.setDate(slaDeadline.getDate() + SLA_DAYS);

  const caseId = await generateCaseId();

  const request = await DsarRequest.create({
    caseId,
    userId,
    organizationId,
    requestType,
    description: description || null,
    status: 'pending',
    slaDeadline,
    identityVerified: false,
    disclosureType: 'full',
  });

  await createAuditLog({
    actorId: userId,
    actorRole: req.user.role,
    organizationId,
    action: 'DSAR_SUBMITTED',
    resourceType: 'DsarRequest',
    resourceId: request.id,
    result: 'APPROVED',
    decision: 'APPROVED',
    decisionReason: 'DSAR submitted by data subject',
    description: `[${caseId}] User submitted ${requestType} DSAR to ${org.name}`,
    metadata: { caseId, requestType, organizationId },
    ipAddress: ip,
    severity: 'info',
  });

  return created(res, { request }, `DSAR submitted — case ${caseId}. The organization has 30 days to respond (PDPL Art. 4).`);
};

// ─── Identity Verification ─────────────────────────────────────────────────────

/**
 * POST /api/v1/dsar/requests/:id/verify-identity
 * Mark identity verification complete on a DSAR (OTP, document, etc.).
 * Admin records which verification method was used.
 */
const verifyIdentity = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;
  const { identityVerificationMethod } = req.body;

  if (!orgId) {return forbidden(res, 'No organization associated');}

  const VALID_METHODS = ['otp', 'document', 'in_person', 'digital_signature'];
  if (!VALID_METHODS.includes(identityVerificationMethod)) {
    return badRequest(res, `Invalid verification method. Allowed: ${VALID_METHODS.join(', ')}`);
  }

  const request = await DsarRequest.findOne({ where: { id, organizationId: orgId } });
  if (!request) {return notFound(res, 'DSAR request not found');}

  if (request.identityVerified) {
    return badRequest(res, 'Identity has already been verified for this request');
  }

  // Validate via policy engine
  const identityDecision = policyEngine.validateDsarIdentity({ identityVerified: true });

  await request.update({
    identityVerified: true,
    identityVerifiedAt: new Date(),
    identityVerificationMethod,
    status: request.status === 'pending' ? 'in_progress' : request.status,
  });

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId: orgId,
    action: 'DSAR_IDENTITY_VERIFIED',
    resourceType: 'DsarRequest',
    resourceId: id,
    result: 'APPROVED',
    decision: 'APPROVED',
    decisionReason: `Identity verified via ${identityVerificationMethod}`,
    description: `[${request.caseId}] Identity verified via ${identityVerificationMethod}`,
    metadata: { caseId: request.caseId, identityVerificationMethod },
    ipAddress: getClientIp(req),
    severity: 'info',
  });

  return success(res, { request }, 'Identity verified successfully');
};

// ─── User: List own DSARs ─────────────────────────────────────────────────────

/**
 * GET /api/v1/dsar/requests
 */
const listUserDsarRequests = async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20, status } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const where = { userId };
  if (status) {where.status = status;}

  const { count, rows } = await DsarRequest.findAndCountAll({
    where,
    include: [{ model: Organization, as: 'organization', attributes: ['id', 'name'] }],
    order: [['createdAt', 'DESC']],
    limit: Number(limit),
    offset,
  });

  return success(res, {
    requests: rows,
    pagination: { total: count, page: Number(page), limit: Number(limit), pages: Math.ceil(count / Number(limit)) },
  });
};

// ─── Admin: Process DSARs ─────────────────────────────────────────────────────

/**
 * GET /api/v1/dsar/admin/requests
 */
const listAdminDsarRequests = async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {return forbidden(res, 'No organization associated');}

  const { page = 1, limit = 20, status, requestType } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const where = { organizationId: orgId };
  if (status) {where.status = status;}
  if (requestType) {where.requestType = requestType;}

  const { count, rows } = await DsarRequest.findAndCountAll({
    where,
    include: [
      { model: User, as: 'dataSubject', attributes: ['id', 'name', 'email'] },
      { model: User, as: 'processor', attributes: ['id', 'name'] },
    ],
    order: [['slaDeadline', 'ASC'], ['createdAt', 'DESC']],
    limit: Number(limit),
    offset,
  });

  const overdue = rows.filter((r) => r.isOverdue).length;
  const unverified = rows.filter((r) => !r.identityVerified && r.status !== 'rejected').length;

  return success(res, {
    requests: rows,
    pagination: { total: count, page: Number(page), limit: Number(limit), pages: Math.ceil(count / Number(limit)) },
    summary: { total: count, overdue, unverified },
  });
};

/**
 * GET /api/v1/dsar/admin/requests/:id
 */
const getAdminDsarRequest = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const request = await DsarRequest.findOne({
    where: { id, organizationId: orgId },
    include: [
      { model: User, as: 'dataSubject', attributes: ['id', 'name', 'email', 'phone'] },
      { model: User, as: 'processor', attributes: ['id', 'name'] },
    ],
  });

  if (!request) {return notFound(res, 'DSAR request not found');}
  return success(res, { request });
};

/**
 * PATCH /api/v1/dsar/admin/requests/:id
 * Admin updates status, notes, response data, or sets partial/restricted disclosure.
 */
const processDsarRequest = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;
  const ip = getClientIp(req);

  const {
    status, adminNotes, responseData, rejectionReason,
    disclosureType, restrictionReason, restrictedFields,
  } = req.body;

  if (!orgId) {return forbidden(res, 'No organization associated');}

  const request = await DsarRequest.findOne({
    where: { id, organizationId: orgId },
    include: [{ model: User, as: 'dataSubject', attributes: ['id', 'name', 'email'] }],
  });
  if (!request) {return notFound(res, 'DSAR request not found');}

  if (request.status === 'completed' || request.status === 'rejected') {
    return badRequest(res, 'This request has already been closed');
  }

  // Enforce: completing a request requires identity verification
  if (status === 'completed' && !request.identityVerified) {
    return badRequest(res, 'Cannot complete DSAR — data subject identity has not been verified. Verify identity first (PDPL Art. 4).');
  }

  // Enforce: partial or restricted disclosure requires a reason
  if (disclosureType && disclosureType !== 'full' && !restrictionReason) {
    return badRequest(res, 'A restriction reason is required for partial or restricted disclosure');
  }

  const updates = {};
  if (status) {updates.status = status;}
  if (adminNotes !== undefined) {updates.adminNotes = adminNotes;}
  if (responseData !== undefined) {updates.responseData = responseData;}
  if (rejectionReason !== undefined) {updates.rejectionReason = rejectionReason;}
  if (disclosureType) {updates.disclosureType = disclosureType;}
  if (restrictionReason !== undefined) {updates.restrictionReason = restrictionReason;}
  if (restrictedFields !== undefined) {updates.restrictedFields = restrictedFields;}

  if (status === 'completed' || status === 'rejected') {
    updates.processedAt = new Date();
    updates.processedBy = req.user.id;
  }

  await request.update(updates);

  const disclosureNote = disclosureType && disclosureType !== 'full'
    ? ` | Disclosure: ${disclosureType} — ${restrictionReason}`
    : '';

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId: orgId,
    action: 'DSAR_PROCESSED',
    resourceType: 'DsarRequest',
    resourceId: id,
    result: status === 'rejected' ? 'REJECTED' : 'APPROVED',
    decision: status === 'rejected' ? 'REJECTED' : 'APPROVED',
    decisionReason: rejectionReason || `DSAR ${status || 'updated'}${disclosureNote}`,
    description: `[${request.caseId}] DSAR ${status || 'updated'} for ${request.dataSubject?.name} (${request.requestType})${disclosureNote}`,
    metadata: { caseId: request.caseId, status, requestType: request.requestType, disclosureType, identityVerified: request.identityVerified },
    ipAddress: ip,
    severity: 'warning',
  });

  return success(res, { request }, `DSAR request ${status || 'updated'}`);
};

module.exports = {
  submitDsarRequest,
  verifyIdentity,
  listUserDsarRequests,
  listAdminDsarRequests,
  getAdminDsarRequest,
  processDsarRequest,
};
