const { Dpia, RopaRecord, Organization, User } = require('../models');
const { createAuditLog, getClientIp } = require('../middleware/audit');
const { success, created, notFound, forbidden, badRequest } = require('../utils/response');

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/dpia/assessments
 */
const createAssessment = async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {return forbidden(res, 'No organization associated');}

  const {
    title, description, ropaRecordId, triggerReason,
    necessityAssessment, proportionalityAssessment,
    risksIdentified, mitigationMeasures,
    overallRiskLevel, residualRiskLevel,
    dpoConsultationRequired, reviewDate,
  } = req.body;

  // Validate ropaRecordId belongs to this org if provided
  if (ropaRecordId) {
    const ropaRecord = await RopaRecord.findOne({ where: { id: ropaRecordId, organizationId: orgId } });
    if (!ropaRecord) {return notFound(res, 'RoPA record not found');}
  }

  const assessment = await Dpia.create({
    organizationId: orgId,
    title,
    description,
    ropaRecordId: ropaRecordId || null,
    triggerReason,
    necessityAssessment: necessityAssessment || null,
    proportionalityAssessment: proportionalityAssessment || null,
    risksIdentified: risksIdentified || [],
    mitigationMeasures: mitigationMeasures || [],
    overallRiskLevel: overallRiskLevel || null,
    residualRiskLevel: residualRiskLevel || null,
    dpoConsultationRequired: dpoConsultationRequired ?? false,
    reviewDate: reviewDate || null,
    status: 'draft',
    createdBy: req.user.id,
  });

  // Link DPIA back to RoPA record if provided
  if (ropaRecordId) {
    await RopaRecord.update(
      { dpiaId: assessment.id, dpiaRequired: true },
      { where: { id: ropaRecordId, organizationId: orgId } }
    );
  }

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId: orgId,
    action: 'DPIA_CREATED',
    resourceType: 'Dpia',
    resourceId: assessment.id,
    description: `DPIA created: ${title} (trigger: ${triggerReason})`,
    metadata: { title, triggerReason, ropaRecordId },
    ipAddress: getClientIp(req),
    severity: 'info',
  });

  return created(res, { assessment }, 'DPIA assessment created');
};

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/dpia/assessments
 */
const listAssessments = async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {return forbidden(res, 'No organization associated');}

  const { status, overallRiskLevel } = req.query;

  const where = { organizationId: orgId };
  if (status) {where.status = status;}
  if (overallRiskLevel) {where.overallRiskLevel = overallRiskLevel;}

  const assessments = await Dpia.findAll({
    where,
    order: [['createdAt', 'DESC']],
  });

  const summary = {
    total: assessments.length,
    byStatus: assessments.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {}),
    byRiskLevel: assessments.reduce((acc, a) => {
      if (a.overallRiskLevel) {acc[a.overallRiskLevel] = (acc[a.overallRiskLevel] || 0) + 1;}
      return acc;
    }, {}),
    pendingDpoConsultation: assessments.filter((a) => a.dpoConsultationRequired && !a.dpoApproved).length,
  };

  return success(res, { assessments, summary });
};

// ─── Get One ──────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/dpia/assessments/:id
 */
const getAssessment = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const assessment = await Dpia.findOne({ where: { id, organizationId: orgId } });
  if (!assessment) {return notFound(res, 'DPIA assessment not found');}

  return success(res, { assessment });
};

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * PATCH /api/v1/dpia/assessments/:id
 */
const updateAssessment = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const assessment = await Dpia.findOne({ where: { id, organizationId: orgId } });
  if (!assessment) {return notFound(res, 'DPIA assessment not found');}

  if (assessment.status === 'approved') {
    return badRequest(res, 'Approved DPIAs cannot be edited. Create a new version instead.');
  }

  const allowed = [
    'title', 'description', 'triggerReason',
    'necessityAssessment', 'proportionalityAssessment',
    'risksIdentified', 'mitigationMeasures',
    'overallRiskLevel', 'residualRiskLevel',
    'dpoConsultationRequired', 'dpoConsultationDate', 'dpoRecommendation',
    'reviewDate', 'status', 'rejectionReason',
  ];

  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) {updates[key] = req.body[key];}
  }

  // Handle approval workflow
  if (updates.status === 'approved') {
    updates.approvedBy = req.user.id;
    updates.approvedAt = new Date();
  }

  if (updates.dpoConsultationRequired === false) {
    updates.dpoApproved = null;
    updates.dpoConsultationDate = null;
    updates.dpoRecommendation = null;
  }

  await assessment.update(updates);

  const severity = ['approved', 'rejected'].includes(updates.status) ? 'warning' : 'info';

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId: orgId,
    action: `DPIA_${(updates.status || 'UPDATED').toUpperCase()}`,
    resourceType: 'Dpia',
    resourceId: id,
    description: `DPIA ${updates.status ? updates.status : 'updated'}: ${assessment.title}`,
    metadata: updates,
    ipAddress: getClientIp(req),
    severity,
  });

  return success(res, { assessment }, 'DPIA updated');
};

// ─── DPO Review ───────────────────────────────────────────────────────────────

/**
 * POST /api/v1/dpia/assessments/:id/dpo-review
 * DPO submits consultation outcome (approve / reject / recommend).
 */
const submitDpoReview = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const assessment = await Dpia.findOne({ where: { id, organizationId: orgId } });
  if (!assessment) {return notFound(res, 'DPIA assessment not found');}

  if (!assessment.dpoConsultationRequired) {
    return badRequest(res, 'DPO consultation is not required for this DPIA');
  }

  const { approved, recommendation } = req.body;

  await assessment.update({
    dpoApproved: approved,
    dpoRecommendation: recommendation || null,
    dpoConsultationDate: new Date(),
    status: approved ? 'in_review' : 'requires_update',
  });

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId: orgId,
    action: approved ? 'DPIA_DPO_APPROVED' : 'DPIA_DPO_REJECTED',
    resourceType: 'Dpia',
    resourceId: id,
    description: `DPO ${approved ? 'approved' : 'rejected'} DPIA: ${assessment.title}`,
    metadata: { approved, recommendation },
    ipAddress: getClientIp(req),
    severity: 'warning',
  });

  return success(res, { assessment }, `DPO review ${approved ? 'approved' : 'submitted with recommendations'}`);
};

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * DELETE /api/v1/dpia/assessments/:id
 */
const deleteAssessment = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const assessment = await Dpia.findOne({ where: { id, organizationId: orgId } });
  if (!assessment) {return notFound(res, 'DPIA assessment not found');}

  if (assessment.status === 'approved') {
    return badRequest(res, 'Cannot delete an approved DPIA.');
  }

  const title = assessment.title;
  await assessment.destroy();

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId: orgId,
    action: 'DPIA_DELETED',
    resourceType: 'Dpia',
    resourceId: id,
    description: `DPIA deleted: ${title}`,
    metadata: { title },
    ipAddress: getClientIp(req),
    severity: 'warning',
  });

  return success(res, {}, 'DPIA deleted');
};

module.exports = { createAssessment, listAssessments, getAssessment, updateAssessment, submitDpoReview, deleteAssessment };
