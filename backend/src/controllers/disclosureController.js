const crypto = require('crypto');
const { DisclosureRecord, DataSharingRequest, Organization, User } = require('../models');
const { createAuditLog, getClientIp } = require('../middleware/audit');
const { success, created, notFound, forbidden, badRequest } = require('../utils/response');
const policyEngine = require('../services/policyEngine');

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/disclosure/records
 * Create a disclosure record manually (for pre-registration before sharing).
 * Runs Art. 16 validation automatically.
 */
const createRecord = async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {return forbidden(res, 'No organization associated');}

  const {
    disclosingEntity, receivingEntity, receivingEntityType,
    purpose, purposeCategory, dataCategories, dataFields, estimatedRecords,
    legalBasis, consentReference, isCrossBorder, destinationCountry,
    transferSafeguards, retentionPeriod, expiresAt, dataSharingRequestId,
  } = req.body;

  // Run Art. 16 validation
  const art16Result = policyEngine.validateArt16({
    dataTypes: dataFields || dataCategories || [],
    legalBasis,
    purpose,
    purposeCategory,
    crossBorderTransfer: isCrossBorder,
    transferSafeguards,
    destinationCountry,
  });

  const record = await DisclosureRecord.create({
    organizationId: orgId,
    dataSharingRequestId: dataSharingRequestId || null,
    disclosingEntity,
    receivingEntity,
    receivingEntityType: receivingEntityType || 'organization',
    purpose,
    purposeCategory: purposeCategory || 'other',
    dataCategories: dataCategories || [],
    dataFields: dataFields || [],
    estimatedRecords: estimatedRecords || null,
    legalBasis,
    consentReference: consentReference || null,
    art16ClearanceResult: art16Result.allowed ? 'approved' : 'blocked',
    art16Violations: art16Result.allowed ? [] : art16Result.violations,
    policyDecision: art16Result,
    isCrossBorder: isCrossBorder ?? false,
    destinationCountry: destinationCountry || null,
    transferSafeguards: transferSafeguards || null,
    retentionPeriod: retentionPeriod || null,
    expiresAt: expiresAt || null,
    status: art16Result.allowed ? 'pending' : 'pending',
    createdBy: req.user.id,
  });

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId: orgId,
    action: 'DISCLOSURE_RECORD_CREATED',
    resourceType: 'DisclosureRecord',
    resourceId: record.id,
    result: art16Result.allowed ? 'APPROVED' : 'WARNING',
    decision: art16Result.allowed ? 'APPROVED' : 'BLOCKED',
    decisionReason: art16Result.allowed ? 'No Art. 16 violations' : art16Result.violations.map((v) => v.reason).join('; '),
    description: `Disclosure record created: ${disclosingEntity} → ${receivingEntity} (${purposeCategory})`,
    metadata: { art16Result: { allowed: art16Result.allowed, violations: art16Result.violations } },
    ipAddress: getClientIp(req),
    severity: art16Result.allowed ? 'info' : 'warning',
  });

  const message = art16Result.allowed
    ? 'Disclosure record created — Art. 16 clearance: APPROVED'
    : `Disclosure record created — Art. 16 clearance: BLOCKED (${art16Result.violations.length} violation(s) detected)`;

  return created(res, { record, art16Result }, message);
};

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/disclosure/records
 */
const listRecords = async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {return forbidden(res, 'No organization associated');}

  const { status, art16ClearanceResult, isCrossBorder } = req.query;

  const where = { organizationId: orgId };
  if (status) {where.status = status;}
  if (art16ClearanceResult) {where.art16ClearanceResult = art16ClearanceResult;}
  if (isCrossBorder !== undefined) {where.isCrossBorder = isCrossBorder === 'true';}

  const records = await DisclosureRecord.findAll({
    where,
    order: [['createdAt', 'DESC']],
  });

  const summary = {
    total: records.length,
    approved: records.filter((r) => r.art16ClearanceResult === 'approved').length,
    blocked: records.filter((r) => r.art16ClearanceResult === 'blocked').length,
    crossBorder: records.filter((r) => r.isCrossBorder).length,
    executed: records.filter((r) => r.status === 'executed').length,
    byPurposeCategory: records.reduce((acc, r) => {
      acc[r.purposeCategory] = (acc[r.purposeCategory] || 0) + 1; return acc;
    }, {}),
  };

  return success(res, { records, summary });
};

// ─── Get One ──────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/disclosure/records/:id
 */
const getRecord = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const record = await DisclosureRecord.findOne({ where: { id, organizationId: orgId } });
  if (!record) {return notFound(res, 'Disclosure record not found');}

  return success(res, { record });
};

// ─── Revoke ───────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/disclosure/records/:id/revoke
 */
const revokeRecord = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;
  const { reason } = req.body;

  const record = await DisclosureRecord.findOne({ where: { id, organizationId: orgId } });
  if (!record) {return notFound(res, 'Disclosure record not found');}

  if (record.status === 'revoked') {
    return badRequest(res, 'Disclosure record is already revoked');
  }

  await record.update({
    status: 'revoked',
    revokedAt: new Date(),
    revokedReason: reason || null,
  });

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId: orgId,
    action: 'DISCLOSURE_RECORD_REVOKED',
    resourceType: 'DisclosureRecord',
    resourceId: id,
    result: 'REVOKED',
    decision: 'REVOKED',
    decisionReason: reason || 'Manual revocation',
    description: `Disclosure record revoked: ${record.disclosingEntity} → ${record.receivingEntity}`,
    metadata: { reason },
    ipAddress: getClientIp(req),
    severity: 'warning',
  });

  return success(res, { record }, 'Disclosure record revoked');
};

// ─── Art. 16 Validate (standalone) ───────────────────────────────────────────

/**
 * POST /api/v1/disclosure/validate-art16
 * Run Art. 16 validation without creating a record.
 * Used to pre-check before creating a sharing request.
 */
const validateArt16 = (req, res) => {
  const {
    dataTypes, legalBasis, purpose, purposeCategory,
    crossBorderTransfer, transferSafeguards, destinationCountry, metadata,
  } = req.body;

  const result = policyEngine.validateArt16({
    dataTypes: dataTypes || [],
    legalBasis,
    purpose,
    purposeCategory,
    crossBorderTransfer,
    transferSafeguards,
    destinationCountry,
    metadata,
  });

  return success(res, {
    allowed: result.allowed,
    decision: result.allowed ? 'APPROVED' : 'BLOCKED',
    violations: result.violations,
    warnings: result.warnings,
    recommendation: result.recommendation,
  }, result.allowed ? 'No Art. 16 violations detected' : `Art. 16 validation FAILED — ${result.violations.length} violation(s)`);
};

module.exports = { createRecord, listRecords, getRecord, revokeRecord, validateArt16 };
