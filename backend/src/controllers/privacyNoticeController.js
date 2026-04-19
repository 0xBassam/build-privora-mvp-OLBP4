const { PrivacyNotice, Organization, User } = require('../models');
const { createAuditLog, getClientIp } = require('../middleware/audit');
const { success, created, notFound, forbidden, badRequest } = require('../utils/response');

// ─── Create Notice ────────────────────────────────────────────────────────────

/**
 * POST /api/v1/privacy-notices
 */
const createNotice = async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {return forbidden(res, 'No organization associated');}

  const {
    title, version, purposeOfProcessing, dataTypesCollected,
    retentionSummary, thirdPartySharing, thirdPartyDetails,
    dataSubjectRights, contactEmail, legalBasis, effectiveDate,
    previousVersionId, changeNotes,
  } = req.body;

  // Enforce unique version per org
  const existing = await PrivacyNotice.findOne({ where: { organizationId: orgId, version } });
  if (existing) {
    return badRequest(res, `Version ${version} already exists for your organization`);
  }

  // Deactivate previous active notice if creating new active one
  await PrivacyNotice.update({ isActive: false }, { where: { organizationId: orgId, isActive: true } });

  const notice = await PrivacyNotice.create({
    organizationId: orgId,
    createdBy: req.user.id,
    title,
    version,
    isActive: true,
    purposeOfProcessing,
    dataTypesCollected: dataTypesCollected || [],
    retentionSummary: retentionSummary || null,
    thirdPartySharing: thirdPartySharing ?? false,
    thirdPartyDetails: thirdPartyDetails || null,
    dataSubjectRights: dataSubjectRights || ['access', 'correction', 'deletion', 'portability', 'objection'],
    contactEmail: contactEmail || null,
    legalBasis: legalBasis || null,
    effectiveDate: effectiveDate || null,
    previousVersionId: previousVersionId || null,
    changeNotes: changeNotes || null,
  });

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId: orgId,
    action: 'PRIVACY_NOTICE_CREATED',
    resourceType: 'PrivacyNotice',
    resourceId: notice.id,
    description: `Privacy notice created: v${version} — "${title}"`,
    metadata: { version, thirdPartySharing },
    ipAddress: getClientIp(req),
    severity: 'info',
  });

  return created(res, { notice }, 'Privacy notice created and set as active');
};

/**
 * GET /api/v1/privacy-notices
 * List all versions for this org.
 */
const listNotices = async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {return forbidden(res, 'No organization associated');}

  const notices = await PrivacyNotice.findAll({
    where: { organizationId: orgId },
    include: [{ model: User, as: 'author', attributes: ['id', 'name'] }],
    order: [['createdAt', 'DESC']],
  });

  return success(res, {
    notices,
    activeNotice: notices.find((n) => n.isActive) || null,
    totalVersions: notices.length,
  });
};

/**
 * GET /api/v1/privacy-notices/:id
 */
const getNotice = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const notice = await PrivacyNotice.findOne({
    where: { id, organizationId: orgId },
    include: [{ model: User, as: 'author', attributes: ['id', 'name'] }],
  });

  if (!notice) {return notFound(res, 'Privacy notice not found');}
  return success(res, { notice });
};

/**
 * GET /api/v1/privacy-notices/active
 * Public endpoint — returns the currently active notice for an org.
 */
const getActiveNotice = async (req, res) => {
  const { organizationId } = req.query;
  if (!organizationId) {return badRequest(res, 'organizationId is required');}

  const notice = await PrivacyNotice.findOne({
    where: { organizationId, isActive: true },
    attributes: {
      exclude: ['createdBy', 'previousVersionId', 'changeNotes'],
    },
  });

  if (!notice) {return notFound(res, 'No active privacy notice found for this organization');}
  return success(res, { notice });
};

/**
 * PATCH /api/v1/privacy-notices/:id
 */
const updateNotice = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const notice = await PrivacyNotice.findOne({ where: { id, organizationId: orgId } });
  if (!notice) {return notFound(res, 'Privacy notice not found');}

  const allowed = [
    'title', 'purposeOfProcessing', 'dataTypesCollected', 'retentionSummary',
    'thirdPartySharing', 'thirdPartyDetails', 'dataSubjectRights',
    'contactEmail', 'legalBasis', 'effectiveDate', 'changeNotes',
  ];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) {updates[key] = req.body[key];}
  }

  await notice.update(updates);

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId: orgId,
    action: 'PRIVACY_NOTICE_UPDATED',
    resourceType: 'PrivacyNotice',
    resourceId: id,
    description: `Privacy notice v${notice.version} updated`,
    metadata: Object.keys(updates),
    ipAddress: getClientIp(req),
    severity: 'info',
  });

  return success(res, { notice }, 'Privacy notice updated');
};

/**
 * POST /api/v1/privacy-notices/:id/activate
 * Activate a specific version (deactivates others).
 */
const activateNotice = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const notice = await PrivacyNotice.findOne({ where: { id, organizationId: orgId } });
  if (!notice) {return notFound(res, 'Privacy notice not found');}

  await PrivacyNotice.update({ isActive: false }, { where: { organizationId: orgId } });
  await notice.update({ isActive: true });

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId: orgId,
    action: 'PRIVACY_NOTICE_ACTIVATED',
    resourceType: 'PrivacyNotice',
    resourceId: id,
    description: `Privacy notice v${notice.version} activated`,
    metadata: { version: notice.version },
    ipAddress: getClientIp(req),
    severity: 'info',
  });

  return success(res, { notice }, `Privacy notice v${notice.version} is now active`);
};

module.exports = { createNotice, listNotices, getNotice, getActiveNotice, updateNotice, activateNotice };
