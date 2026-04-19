const { Op } = require('sequelize');
const { RopaRecord, Organization, User } = require('../models');
const { createAuditLog, getClientIp } = require('../middleware/audit');
const { success, created, notFound, forbidden, badRequest } = require('../utils/response');

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/ropa/records
 */
const createRecord = async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {return forbidden(res, 'No organization associated');}

  const {
    activityName, activityDescription, department,
    processingPurpose, legalBasis,
    dataCategories, isSensitiveData, dataSubjectCategories, estimatedDataSubjects,
    recipientCategories, thirdPartyTransfers, crossBorderTransfers, transferSafeguards,
    retentionPeriod, retentionJustification, securityMeasures,
    dpiaRequired, ownerRole, ownerName, nextReviewDate,
  } = req.body;

  const record = await RopaRecord.create({
    organizationId: orgId,
    activityName,
    activityDescription,
    department: department || null,
    processingPurpose,
    legalBasis,
    dataCategories: dataCategories || [],
    isSensitiveData: isSensitiveData ?? false,
    dataSubjectCategories: dataSubjectCategories || [],
    estimatedDataSubjects: estimatedDataSubjects || null,
    recipientCategories: recipientCategories || [],
    thirdPartyTransfers: thirdPartyTransfers ?? false,
    crossBorderTransfers: crossBorderTransfers ?? false,
    transferSafeguards: transferSafeguards || null,
    retentionPeriod: retentionPeriod || null,
    retentionJustification: retentionJustification || null,
    securityMeasures: securityMeasures || null,
    dpiaRequired: dpiaRequired ?? (isSensitiveData || crossBorderTransfers ? true : false),
    ownerRole: ownerRole || 'org_admin',
    ownerName: ownerName || null,
    nextReviewDate: nextReviewDate || null,
    status: 'draft',
    createdBy: req.user.id,
  });

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId: orgId,
    action: 'ROPA_RECORD_CREATED',
    resourceType: 'RopaRecord',
    resourceId: record.id,
    description: `RoPA record created: ${activityName} (legal basis: ${legalBasis})`,
    metadata: { activityName, legalBasis, isSensitiveData, crossBorderTransfers },
    ipAddress: getClientIp(req),
    severity: 'info',
  });

  return created(res, { record }, 'RoPA record created');
};

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/ropa/records
 */
const listRecords = async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {return forbidden(res, 'No organization associated');}

  const { status, legalBasis, isSensitiveData, dpiaRequired } = req.query;

  const where = { organizationId: orgId };
  if (status) {where.status = status;}
  if (legalBasis) {where.legalBasis = legalBasis;}
  if (isSensitiveData !== undefined) {where.isSensitiveData = isSensitiveData === 'true';}
  if (dpiaRequired !== undefined) {where.dpiaRequired = dpiaRequired === 'true';}

  const records = await RopaRecord.findAll({
    where,
    order: [['createdAt', 'DESC']],
    attributes: { exclude: [] },
  });

  const summary = {
    total: records.length,
    byStatus: records.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {}),
    sensitiveDataCount: records.filter((r) => r.isSensitiveData).length,
    crossBorderCount: records.filter((r) => r.crossBorderTransfers).length,
    dpiaRequiredCount: records.filter((r) => r.dpiaRequired).length,
    dpiaCompletedCount: records.filter((r) => r.dpiaRequired && r.dpiaId).length,
  };

  return success(res, { records, summary });
};

// ─── Get One ──────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/ropa/records/:id
 */
const getRecord = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const record = await RopaRecord.findOne({ where: { id, organizationId: orgId } });
  if (!record) {return notFound(res, 'RoPA record not found');}

  return success(res, { record });
};

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * PATCH /api/v1/ropa/records/:id
 */
const updateRecord = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const record = await RopaRecord.findOne({ where: { id, organizationId: orgId } });
  if (!record) {return notFound(res, 'RoPA record not found');}

  const allowed = [
    'activityName', 'activityDescription', 'department',
    'processingPurpose', 'legalBasis',
    'dataCategories', 'isSensitiveData', 'dataSubjectCategories', 'estimatedDataSubjects',
    'recipientCategories', 'thirdPartyTransfers', 'crossBorderTransfers', 'transferSafeguards',
    'retentionPeriod', 'retentionJustification', 'securityMeasures',
    'dpiaRequired', 'dpiaId', 'status', 'ownerRole', 'ownerName',
    'lastReviewedAt', 'nextReviewDate',
  ];

  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) {updates[key] = req.body[key];}
  }

  // If transitioning to active, record review time
  if (updates.status === 'active' && record.status === 'draft') {
    updates.approvedBy = req.user.id;
    updates.approvedAt = new Date();
  }

  await record.update(updates);

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId: orgId,
    action: 'ROPA_RECORD_UPDATED',
    resourceType: 'RopaRecord',
    resourceId: id,
    description: `RoPA record updated: ${record.activityName}`,
    metadata: updates,
    ipAddress: getClientIp(req),
    severity: updates.status ? 'warning' : 'info',
  });

  return success(res, { record }, 'RoPA record updated');
};

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * DELETE /api/v1/ropa/records/:id
 */
const deleteRecord = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const record = await RopaRecord.findOne({ where: { id, organizationId: orgId } });
  if (!record) {return notFound(res, 'RoPA record not found');}

  if (record.status === 'active') {
    return badRequest(res, 'Cannot delete an active RoPA record. Archive it first.');
  }

  const activityName = record.activityName;
  await record.destroy();

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId: orgId,
    action: 'ROPA_RECORD_DELETED',
    resourceType: 'RopaRecord',
    resourceId: id,
    description: `RoPA record deleted: ${activityName}`,
    metadata: { activityName },
    ipAddress: getClientIp(req),
    severity: 'warning',
  });

  return success(res, {}, 'RoPA record deleted');
};

// ─── Stats ────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/ropa/stats
 */
const getStats = async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {return forbidden(res, 'No organization associated');}

  const records = await RopaRecord.findAll({
    where: { organizationId: orgId },
    attributes: ['status', 'legalBasis', 'isSensitiveData', 'crossBorderTransfers', 'dpiaRequired', 'dpiaId'],
  });

  const byLegalBasis = records.reduce((acc, r) => {
    acc[r.legalBasis] = (acc[r.legalBasis] || 0) + 1;
    return acc;
  }, {});

  return success(res, {
    total: records.length,
    active: records.filter((r) => r.status === 'active').length,
    draft: records.filter((r) => r.status === 'draft').length,
    underReview: records.filter((r) => r.status === 'under_review').length,
    archived: records.filter((r) => r.status === 'archived').length,
    withSensitiveData: records.filter((r) => r.isSensitiveData).length,
    withCrossBorderTransfers: records.filter((r) => r.crossBorderTransfers).length,
    dpiaRequired: records.filter((r) => r.dpiaRequired).length,
    dpiaCompleted: records.filter((r) => r.dpiaRequired && r.dpiaId).length,
    byLegalBasis,
  });
};

module.exports = { createRecord, listRecords, getRecord, updateRecord, deleteRecord, getStats };
