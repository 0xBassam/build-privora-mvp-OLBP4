const { ProcessingPurpose, User } = require('../models');
const { createAuditLog, getClientIp } = require('../middleware/audit');
const { success, created, notFound, forbidden, badRequest } = require('../utils/response');

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/purposes
 */
const createPurpose = async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {return forbidden(res, 'No organization associated');}

  const {
    name, description, legalBasis, dataCategories,
    allowedDataTypes, retentionDays, requiresExplicitConsent,
  } = req.body;

  // Validate: sensitive data categories must require explicit consent
  const sensitiveCategories = ['sensitive', 'biometric'];
  const hasSensitive = (dataCategories || []).some((c) => sensitiveCategories.includes(c));
  if (hasSensitive && requiresExplicitConsent === false) {
    return badRequest(res, 'Sensitive and biometric data categories always require explicit consent (PDPL Art. 6)');
  }

  const purpose = await ProcessingPurpose.create({
    organizationId: orgId,
    createdBy: req.user.id,
    name,
    description,
    legalBasis,
    dataCategories: dataCategories || [],
    allowedDataTypes: allowedDataTypes || [],
    retentionDays: retentionDays || null,
    requiresExplicitConsent: hasSensitive ? true : (requiresExplicitConsent ?? true),
  });

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId: orgId,
    action: 'PROCESSING_PURPOSE_CREATED',
    resourceType: 'ProcessingPurpose',
    resourceId: purpose.id,
    description: `Processing purpose created: "${name}" (${legalBasis})`,
    metadata: { legalBasis, dataCategories },
    ipAddress: getClientIp(req),
    severity: 'info',
  });

  return created(res, { purpose }, 'Processing purpose registered');
};

/**
 * GET /api/v1/purposes
 */
const listPurposes = async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {return forbidden(res, 'No organization associated');}

  const purposes = await ProcessingPurpose.findAll({
    where: { organizationId: orgId },
    include: [{ model: User, as: 'creator', attributes: ['id', 'name'] }],
    order: [['name', 'ASC']],
  });

  // Build data category coverage map
  const categoryMap = {};
  for (const p of purposes) {
    for (const cat of (p.dataCategories || [])) {
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    }
  }

  return success(res, {
    purposes,
    summary: {
      total: purposes.length,
      active: purposes.filter((p) => p.isActive).length,
      byLegalBasis: purposes.reduce((acc, p) => {
        acc[p.legalBasis] = (acc[p.legalBasis] || 0) + 1;
        return acc;
      }, {}),
      dataCategories: categoryMap,
    },
  });
};

/**
 * GET /api/v1/purposes/:id
 */
const getPurpose = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const purpose = await ProcessingPurpose.findOne({
    where: { id, organizationId: orgId },
    include: [{ model: User, as: 'creator', attributes: ['id', 'name'] }],
  });

  if (!purpose) {return notFound(res, 'Processing purpose not found');}
  return success(res, { purpose });
};

/**
 * PATCH /api/v1/purposes/:id
 */
const updatePurpose = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const purpose = await ProcessingPurpose.findOne({ where: { id, organizationId: orgId } });
  if (!purpose) {return notFound(res, 'Processing purpose not found');}

  const allowed = [
    'name', 'description', 'legalBasis', 'dataCategories',
    'allowedDataTypes', 'retentionDays', 'requiresExplicitConsent', 'isActive',
  ];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) {updates[key] = req.body[key];}
  }

  // Re-validate sensitive categories
  const categories = updates.dataCategories || purpose.dataCategories || [];
  if (categories.some((c) => ['sensitive', 'biometric'].includes(c))) {
    updates.requiresExplicitConsent = true;
  }

  await purpose.update(updates);

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId: orgId,
    action: 'PROCESSING_PURPOSE_UPDATED',
    resourceType: 'ProcessingPurpose',
    resourceId: id,
    description: `Processing purpose updated: "${purpose.name}"`,
    metadata: Object.keys(updates),
    ipAddress: getClientIp(req),
    severity: 'info',
  });

  return success(res, { purpose }, 'Processing purpose updated');
};

/**
 * DELETE /api/v1/purposes/:id
 */
const deletePurpose = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const purpose = await ProcessingPurpose.findOne({ where: { id, organizationId: orgId } });
  if (!purpose) {return notFound(res, 'Processing purpose not found');}

  await purpose.destroy();

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId: orgId,
    action: 'PROCESSING_PURPOSE_DELETED',
    resourceType: 'ProcessingPurpose',
    resourceId: id,
    description: `Processing purpose deleted: "${purpose.name}"`,
    metadata: { legalBasis: purpose.legalBasis },
    ipAddress: getClientIp(req),
    severity: 'warning',
  });

  return success(res, {}, 'Processing purpose deleted');
};

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * POST /api/v1/purposes/validate
 * Check whether a given set of data types is permitted for a purpose.
 */
const validateDataUsage = async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {return forbidden(res, 'No organization associated');}

  const { purposeId, dataTypes } = req.body;
  if (!purposeId || !Array.isArray(dataTypes)) {
    return badRequest(res, 'purposeId and dataTypes array are required');
  }

  const purpose = await ProcessingPurpose.findOne({ where: { id: purposeId, organizationId: orgId } });
  if (!purpose) {return notFound(res, 'Processing purpose not found');}

  if (!purpose.isActive) {
    return badRequest(res, 'This processing purpose is inactive and cannot be used');
  }

  const allowed = purpose.allowedDataTypes || [];
  const unauthorized = allowed.length > 0
    ? dataTypes.filter((dt) => !allowed.includes(dt))
    : [];

  return success(res, {
    purposeId,
    purposeName: purpose.name,
    requestedDataTypes: dataTypes,
    allowedDataTypes: allowed,
    unauthorizedDataTypes: unauthorized,
    isValid: unauthorized.length === 0,
    violation: unauthorized.length > 0
      ? `Data types [${unauthorized.join(', ')}] are not approved for purpose "${purpose.name}" (PDPL Art. 5 — data minimization)`
      : null,
  });
};

module.exports = { createPurpose, listPurposes, getPurpose, updatePurpose, deletePurpose, validateDataUsage };
