const { SensitiveDataRecord, ConsentRequest, Organization, User } = require('../models');
const { createAuditLog, getClientIp } = require('../middleware/audit');
const { success, created, notFound, forbidden, badRequest } = require('../utils/response');

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/sensitive-data/records
 */
const createRecord = async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {return forbidden(res, 'No organization associated');}

  const {
    dataType, dataTypeDescription, processingPurpose, legalBasis,
    consentRequestId, safeguards, accessControls,
    encryptionApplied, pseudonymizationApplied, estimatedRecords,
    reviewDate,
  } = req.body;

  // Validate consent request if legalBasis is explicit_consent
  if (legalBasis === 'explicit_consent' && consentRequestId) {
    const consentReq = await ConsentRequest.findOne({
      where: { id: consentRequestId, organizationId: orgId },
    });
    if (!consentReq) {return notFound(res, 'Consent request not found');}
  }

  if (legalBasis === 'explicit_consent' && !consentRequestId) {
    return badRequest(res, 'A consentRequestId is required when legalBasis is explicit_consent');
  }

  const record = await SensitiveDataRecord.create({
    organizationId: orgId,
    dataType,
    dataTypeDescription,
    processingPurpose,
    legalBasis,
    consentRequestId: consentRequestId || null,
    // Sensitive data almost always requires a DPIA — auto-flag
    dpiaRequired: true,
    dpiaStatus: 'not_started',
    safeguards,
    accessControls: accessControls || null,
    encryptionApplied: encryptionApplied ?? false,
    pseudonymizationApplied: pseudonymizationApplied ?? false,
    estimatedRecords: estimatedRecords || null,
    status: 'active',
    reviewDate: reviewDate || null,
    createdBy: req.user.id,
  });

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId: orgId,
    action: 'SENSITIVE_DATA_RECORD_CREATED',
    resourceType: 'SensitiveDataRecord',
    resourceId: record.id,
    description: `Sensitive data record created: ${dataType} (legal basis: ${legalBasis})`,
    metadata: { dataType, legalBasis, encryptionApplied, pseudonymizationApplied },
    ipAddress: getClientIp(req),
    severity: 'warning',
  });

  return created(res, { record }, 'Sensitive data record created. DPIA assessment required.');
};

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/sensitive-data/records
 */
const listRecords = async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {return forbidden(res, 'No organization associated');}

  const { status, dataType, legalBasis, dpiaStatus } = req.query;

  const where = { organizationId: orgId };
  if (status) {where.status = status;}
  if (dataType) {where.dataType = dataType;}
  if (legalBasis) {where.legalBasis = legalBasis;}
  if (dpiaStatus) {where.dpiaStatus = dpiaStatus;}

  const records = await SensitiveDataRecord.findAll({
    where,
    order: [['createdAt', 'DESC']],
  });

  const summary = {
    total: records.length,
    active: records.filter((r) => r.status === 'active').length,
    byDataType: records.reduce((acc, r) => { acc[r.dataType] = (acc[r.dataType] || 0) + 1; return acc; }, {}),
    byLegalBasis: records.reduce((acc, r) => { acc[r.legalBasis] = (acc[r.legalBasis] || 0) + 1; return acc; }, {}),
    dpiaNotStarted: records.filter((r) => r.dpiaRequired && r.dpiaStatus === 'not_started').length,
    withEncryption: records.filter((r) => r.encryptionApplied).length,
    withPseudonymization: records.filter((r) => r.pseudonymizationApplied).length,
  };

  return success(res, { records, summary });
};

// ─── Get One ──────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/sensitive-data/records/:id
 */
const getRecord = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const record = await SensitiveDataRecord.findOne({ where: { id, organizationId: orgId } });
  if (!record) {return notFound(res, 'Sensitive data record not found');}

  return success(res, { record });
};

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * PATCH /api/v1/sensitive-data/records/:id
 */
const updateRecord = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const record = await SensitiveDataRecord.findOne({ where: { id, organizationId: orgId } });
  if (!record) {return notFound(res, 'Sensitive data record not found');}

  const allowed = [
    'dataTypeDescription', 'processingPurpose', 'legalBasis',
    'consentRequestId', 'dpiaId', 'dpiaStatus',
    'safeguards', 'accessControls',
    'encryptionApplied', 'pseudonymizationApplied', 'estimatedRecords',
    'status', 'reviewDate',
  ];

  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) {updates[key] = req.body[key];}
  }

  await record.update(updates);

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId: orgId,
    action: 'SENSITIVE_DATA_RECORD_UPDATED',
    resourceType: 'SensitiveDataRecord',
    resourceId: id,
    description: `Sensitive data record updated: ${record.dataType}`,
    metadata: updates,
    ipAddress: getClientIp(req),
    severity: 'warning',
  });

  return success(res, { record }, 'Sensitive data record updated');
};

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * DELETE /api/v1/sensitive-data/records/:id
 */
const deleteRecord = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const record = await SensitiveDataRecord.findOne({ where: { id, organizationId: orgId } });
  if (!record) {return notFound(res, 'Sensitive data record not found');}

  if (record.status === 'active') {
    return badRequest(res, 'Cannot delete an active sensitive data record. Suspend or discontinue it first.');
  }

  const dataType = record.dataType;
  await record.destroy();

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId: orgId,
    action: 'SENSITIVE_DATA_RECORD_DELETED',
    resourceType: 'SensitiveDataRecord',
    resourceId: id,
    description: `Sensitive data record deleted: ${dataType}`,
    metadata: { dataType },
    ipAddress: getClientIp(req),
    severity: 'critical',
  });

  return success(res, {}, 'Sensitive data record deleted');
};

// ─── Risk Overview ────────────────────────────────────────────────────────────

/**
 * GET /api/v1/sensitive-data/risk-overview
 */
const getRiskOverview = async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {return forbidden(res, 'No organization associated');}

  const records = await SensitiveDataRecord.findAll({
    where: { organizationId: orgId, status: 'active' },
    attributes: ['dataType', 'legalBasis', 'dpiaRequired', 'dpiaStatus', 'encryptionApplied', 'pseudonymizationApplied'],
  });

  const unprotected = records.filter((r) => !r.encryptionApplied && !r.pseudonymizationApplied);
  const dpiaNotStarted = records.filter((r) => r.dpiaRequired && r.dpiaStatus === 'not_started');
  const consentBased = records.filter((r) => r.legalBasis === 'explicit_consent');

  return success(res, {
    totalActive: records.length,
    unprotectedRecords: unprotected.length,
    dpiaNotStarted: dpiaNotStarted.length,
    consentBasedRecords: consentBased.length,
    riskScore: unprotected.length > 0 || dpiaNotStarted.length > 0 ? 'high' : 'low',
    byDataType: records.reduce((acc, r) => { acc[r.dataType] = (acc[r.dataType] || 0) + 1; return acc; }, {}),
  });
};

module.exports = { createRecord, listRecords, getRecord, updateRecord, deleteRecord, getRiskOverview };
