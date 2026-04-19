/**
 * retentionScheduler.js
 * Automated data retention enforcement — PDPL Art. 18.
 *
 * Jobs:
 *  1. Daily  06:00 — evaluate all active retention policies; auto-delete/anonymize expired data
 *  2. Daily  07:00 — send pre-expiry admin alerts (within warningDays)
 *
 * Each enforcement action produces a DestructionCertificate as proof.
 */

const cron = require('node-cron');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { RetentionPolicy, ConsentTransaction, DestructionCertificate, AuditLog } = require('../models');

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildVerificationHash(fields) {
  const payload = JSON.stringify(fields, Object.keys(fields).sort());
  return crypto.createHash('sha256').update(payload).digest('hex');
}

async function generateCertificateNumber() {
  const year = new Date().getFullYear();
  const prefix = `DEST-${year}-`;
  const count = await DestructionCertificate.count({
    where: { certificateNumber: { [Op.like]: `${prefix}%` } },
  });
  return `${prefix}${String(count + 1).padStart(6, '0')}`;
}

async function logSystemAudit({ action, resourceId, resourceType, description, result, decision, decisionReason, organizationId, metadata }) {
  try {
    await AuditLog.create({
      actorId: null,
      actorRole: 'system',
      organizationId: organizationId || null,
      action,
      resourceType,
      resourceId,
      result,
      decision,
      decisionReason,
      description,
      metadata: metadata || {},
      ipAddress: '127.0.0.1',
      severity: 'warning',
    });
  } catch (err) {
    console.error('[RetentionScheduler] Failed to write audit log:', err.message);
  }
}

// ── Job 1: Enforce Retention — runs daily at 06:00 ───────────────────────────

async function enforceRetentionPolicies() {
  console.log('[RetentionScheduler] Starting daily retention enforcement…');

  const activePolicies = await RetentionPolicy.findAll({
    where: { isActive: true, action: { [Op.in]: ['delete', 'anonymize'] } },
  });

  for (const policy of activePolicies) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

      // Find expired consent transactions for this org + data category
      const expired = await ConsentTransaction.findAll({
        where: {
          organizationId: policy.organizationId,
          createdAt: { [Op.lt]: cutoffDate },
          status: { [Op.in]: ['approved', 'withdrawn'] },
        },
        limit: 500,
      });

      if (expired.length === 0) {continue;}

      const certificateNumber = await generateCertificateNumber();
      const destructionMethod = policy.action === 'delete' ? 'deletion' : 'anonymization';
      const now = new Date();

      if (policy.action === 'delete') {
        await ConsentTransaction.destroy({
          where: { id: { [Op.in]: expired.map((r) => r.id) } },
        });
      } else {
        // Anonymize: null out PII fields
        await ConsentTransaction.update(
          { metadata: null, ipAddress: null },
          { where: { id: { [Op.in]: expired.map((r) => r.id) } } }
        );
      }

      const hashPayload = {
        certificateNumber,
        organizationId: policy.organizationId,
        dataCategory: policy.dataCategory,
        dataDescription: `Automated ${policy.action} of ${expired.length} ConsentTransaction records (policy: ${policy.name})`,
        destructionMethod,
        destructionScope: 'consent_transactions table',
        destructedAt: now.toISOString(),
        destructionTrigger: 'retention_expiry',
        createdBy: 'system',
      };

      await DestructionCertificate.create({
        organizationId: policy.organizationId,
        certificateNumber,
        dataCategory: policy.dataCategory,
        dataDescription: hashPayload.dataDescription,
        recordCount: expired.length,
        retentionPolicyId: policy.id,
        destructionMethod,
        destructionScope: hashPayload.destructionScope,
        destructedAt: now,
        destructionTrigger: 'retention_expiry',
        verificationHash: buildVerificationHash(hashPayload),
        legalBasisForDestruction: `PDPL Art. 18 — retention period of ${policy.retentionDays} days exceeded`,
        createdBy: null,
      });

      await policy.update({ lastRunAt: now });

      await logSystemAudit({
        action: 'RETENTION_ENFORCEMENT_EXECUTED',
        resourceId: policy.id,
        resourceType: 'RetentionPolicy',
        organizationId: policy.organizationId,
        result: 'APPROVED',
        decision: 'EXECUTED',
        decisionReason: `${expired.length} records ${policy.action}d — policy: ${policy.name}`,
        description: `[Auto] Retention enforcement: ${expired.length} records ${policy.action}d for org ${policy.organizationId} (${policy.dataCategory})`,
        metadata: { policyId: policy.id, recordCount: expired.length, certificateNumber, destructionMethod },
      });

      console.log(`[RetentionScheduler] Policy "${policy.name}": ${policy.action}d ${expired.length} records → cert ${certificateNumber}`);
    } catch (err) {
      console.error(`[RetentionScheduler] Error enforcing policy ${policy.id}:`, err.message);
    }
  }

  console.log('[RetentionScheduler] Retention enforcement complete.');
}

// ── Job 2: Pre-expiry Admin Alerts — runs daily at 07:00 ─────────────────────

async function sendPreExpiryAlerts() {
  console.log('[RetentionScheduler] Checking for pre-expiry alerts…');

  const alertPolicies = await RetentionPolicy.findAll({
    where: { isActive: true },
  });

  for (const policy of alertPolicies) {
    try {
      const warningCutoff = new Date();
      warningCutoff.setDate(warningCutoff.getDate() - (policy.retentionDays - policy.warningDays));

      const expiryCutoff = new Date();
      expiryCutoff.setDate(expiryCutoff.getDate() - policy.retentionDays);

      const nearing = await ConsentTransaction.count({
        where: {
          organizationId: policy.organizationId,
          createdAt: { [Op.between]: [expiryCutoff, warningCutoff] },
          status: { [Op.in]: ['approved', 'withdrawn'] },
        },
      });

      if (nearing === 0) {continue;}

      await logSystemAudit({
        action: 'RETENTION_EXPIRY_ALERT',
        resourceId: policy.id,
        resourceType: 'RetentionPolicy',
        organizationId: policy.organizationId,
        result: 'WARNING',
        decision: 'ALERT',
        decisionReason: `${nearing} records expiring within ${policy.warningDays} days`,
        description: `[Alert] ${nearing} ${policy.dataCategory} records will expire in <${policy.warningDays} days (policy: ${policy.name})`,
        metadata: { policyId: policy.id, nearing, warningDays: policy.warningDays, action: policy.action },
      });

      console.log(`[RetentionScheduler] Alert: ${nearing} records near expiry for policy "${policy.name}" (org ${policy.organizationId})`);
    } catch (err) {
      console.error(`[RetentionScheduler] Error checking alerts for policy ${policy.id}:`, err.message);
    }
  }

  console.log('[RetentionScheduler] Pre-expiry alert check complete.');
}

// ── Register Jobs ─────────────────────────────────────────────────────────────

function startRetentionScheduler() {
  // Daily enforcement at 06:00
  cron.schedule('0 6 * * *', enforceRetentionPolicies, {
    timezone: 'Asia/Riyadh',
  });

  // Daily pre-expiry alerts at 07:00
  cron.schedule('0 7 * * *', sendPreExpiryAlerts, {
    timezone: 'Asia/Riyadh',
  });

  console.log('[RetentionScheduler] Scheduled: enforcement @ 06:00, alerts @ 07:00 (Asia/Riyadh)');
}

module.exports = { startRetentionScheduler, enforceRetentionPolicies, sendPreExpiryAlerts };
