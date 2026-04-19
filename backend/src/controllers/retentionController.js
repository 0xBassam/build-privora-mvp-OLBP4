const { Op } = require('sequelize');
const { RetentionPolicy, ConsentTransaction, ConsentRequest, Organization, User } = require('../models');
const { createAuditLog, getClientIp } = require('../middleware/audit');
const { success, created, notFound, forbidden, badRequest } = require('../utils/response');

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/retention/policies
 */
const createPolicy = async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {return forbidden(res, 'No organization associated');}

  const { name, dataCategory, purpose, retentionDays, warningDays, action } = req.body;

  const policy = await RetentionPolicy.create({
    organizationId: orgId,
    name,
    dataCategory,
    purpose: purpose || null,
    retentionDays,
    warningDays: warningDays ?? 30,
    action: action || 'alert_only',
  });

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId: orgId,
    action: 'RETENTION_POLICY_CREATED',
    resourceType: 'RetentionPolicy',
    resourceId: policy.id,
    description: `Retention policy created: ${name} (${dataCategory}, ${retentionDays} days, action: ${action})`,
    metadata: { dataCategory, retentionDays, action },
    ipAddress: getClientIp(req),
    severity: 'info',
  });

  return created(res, { policy }, 'Retention policy created');
};

/**
 * GET /api/v1/retention/policies
 */
const listPolicies = async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {return forbidden(res, 'No organization associated');}

  const policies = await RetentionPolicy.findAll({
    where: { organizationId: orgId },
    order: [['dataCategory', 'ASC'], ['retentionDays', 'ASC']],
  });

  return success(res, {
    policies,
    summary: {
      total: policies.length,
      active: policies.filter((p) => p.isActive).length,
      byCategory: policies.reduce((acc, p) => {
        acc[p.dataCategory] = (acc[p.dataCategory] || 0) + 1;
        return acc;
      }, {}),
    },
  });
};

/**
 * PATCH /api/v1/retention/policies/:id
 */
const updatePolicy = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const policy = await RetentionPolicy.findOne({ where: { id, organizationId: orgId } });
  if (!policy) {return notFound(res, 'Retention policy not found');}

  const allowed = ['name', 'purpose', 'retentionDays', 'warningDays', 'action', 'isActive'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) {updates[key] = req.body[key];}
  }

  await policy.update(updates);

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId: orgId,
    action: 'RETENTION_POLICY_UPDATED',
    resourceType: 'RetentionPolicy',
    resourceId: id,
    description: `Retention policy updated: ${policy.name}`,
    metadata: updates,
    ipAddress: getClientIp(req),
    severity: 'info',
  });

  return success(res, { policy }, 'Retention policy updated');
};

/**
 * DELETE /api/v1/retention/policies/:id
 */
const deletePolicy = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const policy = await RetentionPolicy.findOne({ where: { id, organizationId: orgId } });
  if (!policy) {return notFound(res, 'Retention policy not found');}

  await policy.destroy();

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId: orgId,
    action: 'RETENTION_POLICY_DELETED',
    resourceType: 'RetentionPolicy',
    resourceId: id,
    description: `Retention policy deleted: ${policy.name}`,
    metadata: { dataCategory: policy.dataCategory },
    ipAddress: getClientIp(req),
    severity: 'warning',
  });

  return success(res, {}, 'Retention policy deleted');
};

// ─── Retention Check ──────────────────────────────────────────────────────────

/**
 * POST /api/v1/retention/run-check
 * Scan ConsentTransactions against active retention policies.
 * Returns a report of expired/expiring records and applies actions.
 */
const runRetentionCheck = async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {return forbidden(res, 'No organization associated');}

  const { dryRun = true } = req.body;

  const policies = await RetentionPolicy.findAll({
    where: { organizationId: orgId, isActive: true },
  });

  if (policies.length === 0) {
    return success(res, { report: [], summary: { total: 0, expired: 0, expiringSoon: 0 } },
      'No active retention policies found');
  }

  // Fetch approved consent transactions for this org
  const transactions = await ConsentTransaction.findAll({
    where: {
      organizationId: orgId,
      status: 'approved',
      respondedAt: { [Op.ne]: null },
    },
    include: [
      { model: ConsentRequest, as: 'consentRequest', attributes: ['id', 'title', 'dataTypes', 'purpose'] },
      { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
    ],
  });

  const now = new Date();
  const report = [];
  let expiredCount = 0;
  let expiringSoonCount = 0;

  for (const tx of transactions) {
    if (!tx.respondedAt || !tx.consentRequest) {continue;}

    const consentDate = new Date(tx.respondedAt);
    const dataTypes = tx.consentRequest.dataTypes || [];

    // Find matching policies for this transaction's data types
    for (const policy of policies) {
      // Simple category matching — map policy dataCategory to data type keywords
      const categoryKeywords = {
        pii: ['name', 'email', 'phone', 'address', 'national_id', 'dob', 'date_of_birth'],
        sensitive: ['health_data', 'health', 'medical', 'diagnosis', 'biometric'],
        financial: ['financial_data', 'financial', 'bank', 'credit', 'salary'],
        biometric: ['biometric', 'fingerprint', 'face', 'retina'],
        behavioral: ['behavioral_data', 'behavioral', 'browsing', 'activity'],
        location: ['location_data', 'location', 'gps', 'address'],
        general: [],
      };

      const keywords = categoryKeywords[policy.dataCategory] || [];
      const matches = policy.dataCategory === 'general' ||
        dataTypes.some((dt) => keywords.some((kw) => dt.toLowerCase().includes(kw)));

      if (!matches) {continue;}

      const expiryDate = new Date(consentDate.getTime() + policy.retentionDays * 24 * 60 * 60 * 1000);
      const warningDate = new Date(expiryDate.getTime() - policy.warningDays * 24 * 60 * 60 * 1000);
      const isExpired = now > expiryDate;
      const isExpiringSoon = !isExpired && now >= warningDate;

      if (!isExpired && !isExpiringSoon) {continue;}

      const entry = {
        transactionId: tx.id,
        userId: tx.userId,
        userName: tx.user?.name,
        userEmail: tx.user?.email,
        consentRequestId: tx.consentRequestId,
        consentTitle: tx.consentRequest.title,
        dataTypes,
        policyId: policy.id,
        policyName: policy.name,
        dataCategory: policy.dataCategory,
        action: policy.action,
        consentDate: consentDate.toISOString(),
        expiryDate: expiryDate.toISOString(),
        status: isExpired ? 'expired' : 'expiring_soon',
        daysOverdue: isExpired ? Math.ceil((now - expiryDate) / (24 * 60 * 60 * 1000)) : null,
        daysUntilExpiry: !isExpired ? Math.ceil((expiryDate - now) / (24 * 60 * 60 * 1000)) : null,
        actionTaken: null,
      };

      if (!dryRun && isExpired) {
        if (policy.action === 'delete') {
          // In a real system, this would trigger a deletion workflow
          // For MVP, we log the action and mark as processed
          entry.actionTaken = 'deletion_queued';
          await createAuditLog({
            actorId: req.user.id,
            actorRole: req.user.role,
            organizationId: orgId,
            action: 'DATA_DELETION_QUEUED',
            resourceType: 'ConsentTransaction',
            resourceId: tx.id,
            description: `Data deletion queued for ${tx.user?.name} — policy: ${policy.name}`,
            metadata: { policyId: policy.id, dataTypes, expiryDate: expiryDate.toISOString() },
            ipAddress: getClientIp(req),
            severity: 'critical',
          });
        } else if (policy.action === 'anonymize') {
          entry.actionTaken = 'anonymization_queued';
          await createAuditLog({
            actorId: req.user.id,
            actorRole: req.user.role,
            organizationId: orgId,
            action: 'DATA_ANONYMIZATION_QUEUED',
            resourceType: 'ConsentTransaction',
            resourceId: tx.id,
            description: `Data anonymization queued for ${tx.user?.name} — policy: ${policy.name}`,
            metadata: { policyId: policy.id, dataTypes, expiryDate: expiryDate.toISOString() },
            ipAddress: getClientIp(req),
            severity: 'warning',
          });
        }
      }

      if (isExpired) {expiredCount++;}
      if (isExpiringSoon) {expiringSoonCount++;}
      report.push(entry);
    }
  }

  // Update lastRunAt for all policies
  if (!dryRun) {
    await RetentionPolicy.update(
      { lastRunAt: now },
      { where: { organizationId: orgId, isActive: true } }
    );
  }

  return success(res, {
    dryRun,
    report,
    summary: {
      total: report.length,
      expired: expiredCount,
      expiringSoon: expiringSoonCount,
      policiesChecked: policies.length,
      transactionsScanned: transactions.length,
    },
  }, dryRun ? 'Dry run complete — no actions taken' : `Retention check complete: ${expiredCount} expired, ${expiringSoonCount} expiring soon`);
};

/**
 * GET /api/v1/retention/status
 * Quick summary of data retention health for the dashboard.
 */
const getRetentionStatus = async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {return forbidden(res, 'No organization associated');}

  const policies = await RetentionPolicy.findAll({
    where: { organizationId: orgId, isActive: true },
  });

  const hasPolicies = policies.length > 0;
  const coverageCategories = [...new Set(policies.map((p) => p.dataCategory))];

  return success(res, {
    hasPolicies,
    policyCount: policies.length,
    coverageCategories,
    missingCategories: ['pii', 'sensitive', 'financial', 'biometric'].filter(
      (c) => !coverageCategories.includes(c)
    ),
    lastRunAt: policies.reduce((latest, p) => {
      if (!p.lastRunAt) {return latest;}
      return !latest || new Date(p.lastRunAt) > new Date(latest) ? p.lastRunAt : latest;
    }, null),
  });
};

module.exports = { createPolicy, listPolicies, updatePolicy, deletePolicy, runRetentionCheck, getRetentionStatus };
