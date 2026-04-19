const { Op } = require('sequelize');
const {
  ConsentRequest,
  ConsentTransaction,
  Organization,
  User,
} = require('../models');
const { createAuditLog, getClientIp } = require('../middleware/audit');
const { success, created, badRequest, notFound, forbidden } = require('../utils/response');

// ─── User-facing consent actions ─────────────────────────────────────────────

/**
 * GET /api/v1/consents/requests
 * List pending consent requests for the authenticated user.
 */
const listRequestsForUser = async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  // Get IDs of requests already responded to by this user
  const respondedIds = await ConsentTransaction.findAll({
    where: { userId, status: { [Op.in]: ['approved', 'rejected'] } },
    attributes: ['consentRequestId'],
    raw: true,
  }).then((rows) => rows.map((r) => r.consentRequestId));

  const { count, rows } = await ConsentRequest.findAndCountAll({
    where: {
      isActive: true,
      id: { [Op.notIn]: respondedIds },
      [Op.or]: [
        { expiresAt: null },
        { expiresAt: { [Op.gt]: new Date() } },
      ],
    },
    include: [{ model: Organization, as: 'organization', attributes: ['id', 'name', 'logoUrl'] }],
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
 * POST /api/v1/consents/:id/respond
 * Approve, reject, or withdraw a consent request.
 */
const respondToConsent = async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  const userId = req.user.id;
  const ip = getClientIp(req);

  if (!['approved', 'rejected', 'withdrawn'].includes(status)) {
    return badRequest(res, 'Status must be approved, rejected, or withdrawn');
  }

  const consentRequest = await ConsentRequest.findByPk(id, {
    include: [{ model: Organization, as: 'organization' }],
  });
  if (!consentRequest || !consentRequest.isActive) {
    return notFound(res, 'Consent request not found or no longer active');
  }

  // For withdrawal, find the existing approved transaction
  if (status === 'withdrawn') {
    const existing = await ConsentTransaction.findOne({
      where: { userId, consentRequestId: id, status: 'approved' },
      order: [['createdAt', 'DESC']],
    });
    if (!existing) {
      return badRequest(res, 'No approved consent to withdraw');
    }

    const transaction = await ConsentTransaction.create({
      consentRequestId: id,
      userId,
      organizationId: consentRequest.organizationId,
      status: 'withdrawn',
      previousStatus: 'approved',
      reason: reason || null,
      respondedAt: new Date(),
      ipAddress: ip,
      userAgent: req.headers['user-agent'],
    });

    await createAuditLog({
      actorId: userId,
      actorRole: req.user.role,
      organizationId: consentRequest.organizationId,
      action: 'CONSENT_WITHDRAWN',
      resourceType: 'ConsentTransaction',
      resourceId: transaction.id,
      description: `User withdrew consent for request: ${consentRequest.title}`,
      metadata: { consentRequestId: id, reason },
      ipAddress: ip,
    });

    return success(res, { transaction }, 'Consent withdrawn successfully');
  }

  // Check for duplicate response (approve/reject)
  const existing = await ConsentTransaction.findOne({
    where: { userId, consentRequestId: id, status: { [Op.in]: ['approved', 'rejected'] } },
  });
  if (existing) {
    return badRequest(res, `You have already ${existing.status} this consent request`);
  }

  const transaction = await ConsentTransaction.create({
    consentRequestId: id,
    userId,
    organizationId: consentRequest.organizationId,
    status,
    reason: reason || null,
    respondedAt: new Date(),
    ipAddress: ip,
    userAgent: req.headers['user-agent'],
  });

  const actionName = status === 'approved' ? 'CONSENT_APPROVED' : 'CONSENT_REJECTED';
  await createAuditLog({
    actorId: userId,
    actorRole: req.user.role,
    organizationId: consentRequest.organizationId,
    action: actionName,
    resourceType: 'ConsentTransaction',
    resourceId: transaction.id,
    description: `User ${status} consent for request: ${consentRequest.title}`,
    metadata: { consentRequestId: id, reason },
    ipAddress: ip,
  });

  return success(res, { transaction }, `Consent ${status} successfully`);
};

/**
 * GET /api/v1/consents/history
 * Get the authenticated user's full consent history.
 */
const getUserConsentHistory = async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20, status } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const where = { userId };
  if (status) {where.status = status;}

  const { count, rows } = await ConsentTransaction.findAndCountAll({
    where,
    include: [
      {
        model: ConsentRequest,
        as: 'consentRequest',
        attributes: ['id', 'title', 'purpose', 'dataTypes'],
        include: [{ model: Organization, as: 'organization', attributes: ['id', 'name', 'logoUrl'] }],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit: Number(limit),
    offset,
  });

  return success(res, {
    history: rows,
    pagination: { total: count, page: Number(page), limit: Number(limit), pages: Math.ceil(count / Number(limit)) },
  });
};

// ─── Organization-facing consent management ───────────────────────────────────

/**
 * POST /api/v1/organizations/consents
 * Create a new consent request (org admin only).
 */
const createConsentRequest = async (req, res) => {
  const {
    title, titleAr, description, descriptionAr,
    dataTypes, purpose, legalBasis, retentionPeriod,
    expiresAt, privacyPolicyUrl,
  } = req.body;

  const organizationId = req.user.organizationId;
  if (!organizationId) {
    return forbidden(res, 'No organization associated with this admin account');
  }

  const consentRequest = await ConsentRequest.create({
    organizationId,
    title,
    titleAr,
    description,
    descriptionAr,
    dataTypes: dataTypes || [],
    purpose,
    legalBasis: legalBasis || 'consent',
    retentionPeriod,
    expiresAt: expiresAt || null,
    privacyPolicyUrl,
    createdBy: req.user.id,
  });

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId,
    action: 'CONSENT_REQUEST_CREATED',
    resourceType: 'ConsentRequest',
    resourceId: consentRequest.id,
    description: `Created consent request: ${title}`,
    ipAddress: getClientIp(req),
  });

  return created(res, { consentRequest }, 'Consent request created successfully');
};

/**
 * GET /api/v1/organizations/consents
 * List consent requests for the authenticated organization.
 */
const listOrgConsentRequests = async (req, res) => {
  const organizationId = req.user.organizationId;
  const { page = 1, limit = 20, isActive } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const where = { organizationId };
  if (isActive !== undefined) {where.isActive = isActive === 'true';}

  const { count, rows } = await ConsentRequest.findAndCountAll({
    where,
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
 * GET /api/v1/organizations/consents/:id/responses
 * List responses (transactions) for a specific consent request.
 */
const getConsentResponses = async (req, res) => {
  const { id } = req.params;
  const organizationId = req.user.organizationId;
  const { page = 1, limit = 50, status } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const consentRequest = await ConsentRequest.findOne({ where: { id, organizationId } });
  if (!consentRequest) {return notFound(res, 'Consent request not found');}

  const where = { consentRequestId: id };
  if (status) {where.status = status;}

  const { count, rows } = await ConsentTransaction.findAndCountAll({
    where,
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
    order: [['createdAt', 'DESC']],
    limit: Number(limit),
    offset,
  });

  return success(res, {
    consentRequest,
    responses: rows,
    pagination: { total: count, page: Number(page), limit: Number(limit), pages: Math.ceil(count / Number(limit)) },
  });
};

/**
 * PATCH /api/v1/organizations/consents/:id
 * Deactivate a consent request.
 */
const updateConsentRequest = async (req, res) => {
  const { id } = req.params;
  const organizationId = req.user.organizationId;
  const { isActive, title, description, retentionPeriod } = req.body;

  const consentRequest = await ConsentRequest.findOne({ where: { id, organizationId } });
  if (!consentRequest) {return notFound(res, 'Consent request not found');}

  const updates = {};
  if (isActive !== undefined) {updates.isActive = isActive;}
  if (title) {updates.title = title;}
  if (description) {updates.description = description;}
  if (retentionPeriod !== undefined) {updates.retentionPeriod = retentionPeriod;}

  await consentRequest.update(updates);

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId,
    action: 'CONSENT_REQUEST_UPDATED',
    resourceType: 'ConsentRequest',
    resourceId: id,
    metadata: updates,
    ipAddress: getClientIp(req),
  });

  return success(res, { consentRequest }, 'Consent request updated');
};

module.exports = {
  listRequestsForUser,
  respondToConsent,
  getUserConsentHistory,
  createConsentRequest,
  listOrgConsentRequests,
  getConsentResponses,
  updateConsentRequest,
};
