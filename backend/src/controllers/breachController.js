const { BreachIncident, User } = require('../models');
const { createAuditLog, getClientIp } = require('../middleware/audit');
const { success, created, badRequest, notFound, forbidden } = require('../utils/response');

// ── Harm assessment → notification thresholds ────────────────────────────────
// PDPL Art. 19: authority must be notified within 72h; users notified for high/critical harm.
function computeNotificationRequirements(harmLevel, affectedDataTypes = []) {
  const sensitiveTypes = ['health', 'biometric', 'financial', 'identity', 'minors', 'criminal'];
  const hasSensitive = affectedDataTypes.some((t) => sensitiveTypes.includes(t));

  const notifyAuthorityRequired = ['medium', 'high', 'critical'].includes(harmLevel) || hasSensitive;
  const notifyUsersRequired = ['high', 'critical'].includes(harmLevel);

  return { notifyAuthorityRequired, notifyUsersRequired };
}

// ─── Create Incident ──────────────────────────────────────────────────────────

/**
 * POST /api/v1/breaches
 * Org admin logs a new data breach incident.
 */
const createIncident = async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {return forbidden(res, 'No organization associated');}

  const {
    title, description, breachType, severity,
    affectedDataTypes, estimatedAffectedUsers, discoveredAt, actionsTaken,
    harmLevel, harmAssessment,
    rootCauseAnalysis, rootCauseCategory, preventiveMeasures,
  } = req.body;

  // Compute notification obligations from harm level
  const notifReqs = harmLevel
    ? computeNotificationRequirements(harmLevel, affectedDataTypes || [])
    : { notifyAuthorityRequired: false, notifyUsersRequired: false };

  const incident = await BreachIncident.create({
    organizationId: orgId,
    reportedBy: req.user.id,
    title,
    description,
    breachType,
    severity: severity || 'medium',
    affectedDataTypes: affectedDataTypes || [],
    estimatedAffectedUsers: estimatedAffectedUsers || null,
    discoveredAt: discoveredAt ? new Date(discoveredAt) : new Date(),
    actionsTaken: actionsTaken || null,
    status: 'open',
    harmLevel: harmLevel || null,
    harmAssessment: harmAssessment || {},
    notifyAuthorityRequired: notifReqs.notifyAuthorityRequired,
    notifyUsersRequired: notifReqs.notifyUsersRequired,
    rootCauseAnalysis: rootCauseAnalysis || null,
    rootCauseCategory: rootCauseCategory || null,
    preventiveMeasures: preventiveMeasures || null,
    timeline: [{
      timestamp: new Date().toISOString(),
      action: 'Incident reported',
      performedBy: req.user.id,
      note: `${breachType} incident logged by ${req.user.name || req.user.email}`,
    }],
  });

  const notifMessage = notifReqs.notifyAuthorityRequired
    ? ' Authority notification REQUIRED within 72h (PDPL Art. 19).'
    : '';

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId: orgId,
    action: 'BREACH_INCIDENT_CREATED',
    resourceType: 'BreachIncident',
    resourceId: incident.id,
    result: 'WARNING',
    decision: notifReqs.notifyAuthorityRequired ? 'NOTIFY_REQUIRED' : 'MONITOR',
    decisionReason: harmLevel
      ? `Harm level: ${harmLevel} — notifyAuthority: ${notifReqs.notifyAuthorityRequired}, notifyUsers: ${notifReqs.notifyUsersRequired}`
      : 'Harm level not yet assessed',
    description: `Data breach incident reported: ${title} (${severity || 'medium'} severity)${notifMessage}`,
    metadata: { breachType, severity, harmLevel, affectedDataTypes, notifReqs },
    ipAddress: getClientIp(req),
    severity: 'critical',
  });

  return created(res, { incident }, `Breach incident created.${notifMessage} Review PDPL Art. 19 obligations.`);
};

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/breaches
 */
const listIncidents = async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {return forbidden(res, 'No organization associated');}

  const { page = 1, limit = 20, status, severity, harmLevel } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const where = { organizationId: orgId };
  if (status) {where.status = status;}
  if (severity) {where.severity = severity;}
  if (harmLevel) {where.harmLevel = harmLevel;}

  const { count, rows } = await BreachIncident.findAndCountAll({
    where,
    include: [{ model: User, as: 'reporter', attributes: ['id', 'name', 'email'] }],
    order: [['discoveredAt', 'DESC']],
    limit: Number(limit),
    offset,
  });

  const open = rows.filter((r) => r.status === 'open' || r.status === 'investigating').length;
  const unnotified = rows.filter((r) => r.notifyAuthorityRequired && !r.notifiedAuthority).length;
  const overdue72h = rows.filter((r) => r.isAuthorityOverdue).length;

  return success(res, {
    incidents: rows,
    pagination: { total: count, page: Number(page), limit: Number(limit), pages: Math.ceil(count / Number(limit)) },
    summary: { total: count, open, unnotified, overdue72h },
  });
};

// ─── Get One ──────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/breaches/:id
 */
const getIncident = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const incident = await BreachIncident.findOne({
    where: { id, organizationId: orgId },
    include: [{ model: User, as: 'reporter', attributes: ['id', 'name', 'email'] }],
  });

  if (!incident) {return notFound(res, 'Incident not found');}
  return success(res, { incident });
};

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * PATCH /api/v1/breaches/:id
 * Update incident status, notifications, harm assessment, RCA.
 */
const updateIncident = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;
  const ip = getClientIp(req);

  const incident = await BreachIncident.findOne({ where: { id, organizationId: orgId } });
  if (!incident) {return notFound(res, 'Incident not found');}

  const {
    status, actionsTaken, notifiedAuthority, notifiedUsers,
    resolvedAt, timelineNote,
    harmLevel, harmAssessment,
    rootCauseAnalysis, rootCauseCategory, preventiveMeasures,
  } = req.body;

  const updates = {};
  if (status) {updates.status = status;}
  if (actionsTaken !== undefined) {updates.actionsTaken = actionsTaken;}

  // Harm assessment update — recompute notification requirements
  if (harmLevel !== undefined) {
    updates.harmLevel = harmLevel;
    const notifReqs = computeNotificationRequirements(harmLevel, incident.affectedDataTypes);
    updates.notifyAuthorityRequired = notifReqs.notifyAuthorityRequired;
    updates.notifyUsersRequired = notifReqs.notifyUsersRequired;
  }
  if (harmAssessment !== undefined) {updates.harmAssessment = harmAssessment;}

  // Root Cause Analysis
  if (rootCauseAnalysis !== undefined) {updates.rootCauseAnalysis = rootCauseAnalysis;}
  if (rootCauseCategory !== undefined) {updates.rootCauseCategory = rootCauseCategory;}
  if (preventiveMeasures !== undefined) {updates.preventiveMeasures = preventiveMeasures;}

  // Notification tracking
  if (notifiedAuthority !== undefined) {
    updates.notifiedAuthority = notifiedAuthority;
    if (notifiedAuthority && !incident.notifiedAuthorityAt) {
      updates.notifiedAuthorityAt = new Date();
    }
  }
  if (notifiedUsers !== undefined) {
    updates.notifiedUsers = notifiedUsers;
    if (notifiedUsers && !incident.notifiedUsersAt) {
      updates.notifiedUsersAt = new Date();
    }
  }
  if (status === 'resolved' && !incident.resolvedAt) {
    updates.resolvedAt = resolvedAt ? new Date(resolvedAt) : new Date();
  }

  // Timeline
  if (timelineNote) {
    const currentTimeline = Array.isArray(incident.timeline) ? incident.timeline : [];
    updates.timeline = [...currentTimeline, {
      timestamp: new Date().toISOString(),
      action: timelineNote,
      performedBy: req.user.id,
    }];
  }

  await incident.update(updates);

  const decisionReason = harmLevel
    ? `Harm level: ${harmLevel} | notifyAuthority: ${updates.notifyAuthorityRequired} | notifyUsers: ${updates.notifyUsersRequired}`
    : `Status: ${status || 'no change'}`;

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId: orgId,
    action: 'BREACH_INCIDENT_UPDATED',
    resourceType: 'BreachIncident',
    resourceId: id,
    result: notifiedAuthority ? 'NOTIFIED' : 'WARNING',
    decision: notifiedAuthority ? 'NOTIFIED' : 'IN_PROGRESS',
    decisionReason,
    description: `Incident updated: ${incident.title} → ${status || 'no status change'}`,
    metadata: { status, notifiedAuthority, notifiedUsers, harmLevel, rootCauseCategory },
    ipAddress: ip,
    severity: 'warning',
  });

  return success(res, { incident }, 'Incident updated');
};

// ─── Harm Assessment (standalone) ─────────────────────────────────────────────

/**
 * POST /api/v1/breaches/:id/harm-assessment
 * Submit a structured harm assessment and auto-compute notification requirements.
 */
const submitHarmAssessment = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const incident = await BreachIncident.findOne({ where: { id, organizationId: orgId } });
  if (!incident) {return notFound(res, 'Incident not found');}

  const {
    financialHarm, reputationalHarm, physicalHarm,
    identityTheftRisk, discriminationRisk, explanation,
    harmLevel,
  } = req.body;

  if (!harmLevel) {return badRequest(res, 'harmLevel is required (low/medium/high/critical)');}

  const harmAssessment = {
    financialHarm: financialHarm ?? false,
    reputationalHarm: reputationalHarm ?? false,
    physicalHarm: physicalHarm ?? false,
    identityTheftRisk: identityTheftRisk ?? false,
    discriminationRisk: discriminationRisk ?? false,
    explanation: explanation || null,
    assessedAt: new Date().toISOString(),
    assessedBy: req.user.id,
  };

  const notifReqs = computeNotificationRequirements(harmLevel, incident.affectedDataTypes);

  const timeline = Array.isArray(incident.timeline) ? incident.timeline : [];
  timeline.push({
    timestamp: new Date().toISOString(),
    action: `Harm assessment submitted: ${harmLevel} level`,
    performedBy: req.user.id,
  });

  await incident.update({
    harmLevel,
    harmAssessment,
    notifyAuthorityRequired: notifReqs.notifyAuthorityRequired,
    notifyUsersRequired: notifReqs.notifyUsersRequired,
    timeline,
  });

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId: orgId,
    action: 'BREACH_HARM_ASSESSED',
    resourceType: 'BreachIncident',
    resourceId: id,
    result: 'WARNING',
    decision: notifReqs.notifyAuthorityRequired ? 'NOTIFY_REQUIRED' : 'MONITOR',
    decisionReason: `Harm level: ${harmLevel} — notifyAuthority: ${notifReqs.notifyAuthorityRequired}, notifyUsers: ${notifReqs.notifyUsersRequired}`,
    description: `Harm assessment completed for incident: ${incident.title} — ${harmLevel}`,
    metadata: { harmLevel, harmAssessment: { financialHarm, reputationalHarm, physicalHarm, identityTheftRisk, discriminationRisk }, notifReqs },
    ipAddress: getClientIp(req),
    severity: ['high', 'critical'].includes(harmLevel) ? 'critical' : 'warning',
  });

  return success(res, {
    incident,
    notificationRequirements: {
      notifyAuthorityRequired: notifReqs.notifyAuthorityRequired,
      notifyUsersRequired: notifReqs.notifyUsersRequired,
      authorityDeadline: notifReqs.notifyAuthorityRequired ? incident.authorityDeadline : null,
      message: notifReqs.notifyAuthorityRequired
        ? 'SDAIA notification required within 72h of breach discovery (PDPL Art. 19)'
        : 'No authority notification required at this harm level',
    },
  }, 'Harm assessment recorded');
};

module.exports = { createIncident, listIncidents, getIncident, updateIncident, submitHarmAssessment };
