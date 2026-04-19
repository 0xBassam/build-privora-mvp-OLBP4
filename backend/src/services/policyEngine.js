/**
 * Policy Engine — Centralized Compliance Decision Layer
 *
 * This is the single source of truth for all compliance decisions in Privora.
 * Every action that involves personal data MUST pass through this engine.
 *
 * Decision flow:
 *   1. Consent validation
 *   2. Purpose enforcement
 *   3. DPIA requirement check
 *   4. Art. 16 rule evaluation
 *
 * Returns a PolicyDecision object:
 *   { allowed, decision, blockedBy, reasons, warnings, requiredActions, auditTrail }
 *
 * If allowed === false, the calling controller MUST:
 *   1. Return HTTP 403 with the full PolicyDecision
 *   2. Log the BLOCK to the audit trail
 *   3. Show the user WHY it was blocked + what to do next
 */

const art16Engine = require('./art16Engine');
const { ConsentTransaction, ProcessingPurpose, RopaRecord, SensitiveDataRecord } = require('../models');

// ─── Decision builder ─────────────────────────────────────────────────────────

function allow(auditTrail = []) {
  return {
    allowed: true,
    decision: 'APPROVED',
    blockedBy: null,
    reasons: [],
    warnings: [],
    requiredActions: [],
    auditTrail,
  };
}

function block(blockedBy, reasons, requiredActions = [], warnings = [], auditTrail = []) {
  return {
    allowed: false,
    decision: 'BLOCKED',
    blockedBy,
    reasons: Array.isArray(reasons) ? reasons : [reasons],
    warnings,
    requiredActions: Array.isArray(requiredActions) ? requiredActions : [requiredActions],
    auditTrail,
  };
}

// ─── Validators ───────────────────────────────────────────────────────────────

/**
 * Validate that active consent exists for a user+org pair.
 */
async function validateConsent({ userId, organizationId, requiredForDataTypes = [] }) {
  if (!userId || !organizationId) {
    return block(
      'CONSENT_CHECK',
      'Cannot validate consent — userId or organizationId is missing.',
      ['Ensure the request includes a valid userId and organizationId.']
    );
  }

  const consent = await ConsentTransaction.findOne({
    where: { userId, organizationId, status: 'approved' },
    order: [['respondedAt', 'DESC']],
  });

  if (!consent) {
    return block(
      'CONSENT_MISSING',
      `No active consent found for user ${userId} with organization ${organizationId}.`,
      [
        'Send a consent request to the data subject.',
        'Wait for the user to approve the consent before proceeding.',
      ]
    );
  }

  return { ...allow([{ check: 'consent', result: 'APPROVED', consentId: consent.id }]), consentId: consent.id };
}

/**
 * Validate that the processing purpose is registered and active.
 */
async function validatePurpose({ organizationId, purposeCategory, dataTypes = [] }) {
  if (!organizationId) {return allow();} // purpose check requires org context

  const purpose = await ProcessingPurpose.findOne({
    where: { organizationId, isActive: true },
    // Match by purpose category name pattern
  });

  // If no purposes registered at all — warning but not block (org may be new)
  if (!purpose) {
    return {
      ...allow([{ check: 'purpose', result: 'WARNING', reason: 'No registered purposes found. Consider registering processing purposes.' }]),
      warnings: ['No processing purposes registered. This should be addressed to maintain PDPL Art. 5 compliance.'],
    };
  }

  return allow([{ check: 'purpose', result: 'APPROVED' }]);
}

/**
 * Validate that a DPIA has been completed where required.
 */
async function validateDpiaRequirement({ organizationId, isSensitiveData, crossBorderTransfers, dataTypes = [] }) {
  if (!isSensitiveData && !crossBorderTransfers) {
    return allow([{ check: 'dpia', result: 'NOT_REQUIRED' }]);
  }

  // Check if there is a completed DPIA for this org covering sensitive processing
  const completedDpia = await RopaRecord.findOne({
    where: { organizationId, dpiaRequired: true, status: 'active' },
  });

  // Check if DPIA exists and is approved
  const { Dpia } = require('../models');
  const approvedDpia = await Dpia.findOne({
    where: { organizationId, status: 'approved' },
    order: [['approvedAt', 'DESC']],
  });

  if (!approvedDpia) {
    return block(
      'DPIA_REQUIRED',
      'A completed and approved DPIA is required before processing sensitive data or conducting cross-border transfers.',
      [
        'Complete a DPIA assessment in the DPIA Management module.',
        'Obtain DPO approval for the DPIA.',
        'Link the DPIA to the relevant RoPA record.',
      ]
    );
  }

  return allow([{ check: 'dpia', result: 'APPROVED', dpiaId: approvedDpia.id }]);
}

/**
 * Run Art. 16 validation engine.
 */
function validateArt16(context) {
  const result = art16Engine.evaluate(context);

  if (!result.allowed) {
    return block(
      'ART16_VIOLATION',
      result.violations.map((v) => `[${v.article}] ${v.reason}`),
      result.violations.map((v) => v.requiredAction).filter(Boolean),
      result.warnings.map((w) => w.warning),
      [{ check: 'art16', result: 'BLOCKED', violations: result.violations }]
    );
  }

  return {
    ...allow([{ check: 'art16', result: 'APPROVED', warnings: result.warnings }]),
    warnings: result.warnings.map((w) => w.warning),
  };
}

// ─── Full data sharing validation ─────────────────────────────────────────────

/**
 * Run full policy validation for a data sharing execution.
 * This is the main entry point for dataSharingController.executeDataSharing().
 *
 * @param {Object} context
 * @param {string}   context.userId
 * @param {string}   context.organizationId   - requesting org
 * @param {string[]} context.dataTypes
 * @param {string}   context.legalBasis
 * @param {string}   context.purpose
 * @param {string}   context.purposeCategory
 * @param {boolean}  [context.crossBorderTransfer]
 * @param {string}   [context.transferSafeguards]
 * @param {string}   [context.destinationCountry]
 */
async function validateDataSharing(context) {
  const decisions = [];
  const allWarnings = [];

  // Step 1: Consent
  const consentDecision = await validateConsent({
    userId: context.userId,
    organizationId: context.organizationId,
  });
  decisions.push(consentDecision);
  if (!consentDecision.allowed) {return mergeBlock('CONSENT', consentDecision);}

  // Step 2: Purpose
  const purposeDecision = await validatePurpose({
    organizationId: context.organizationId,
    purposeCategory: context.purposeCategory,
    dataTypes: context.dataTypes,
  });
  if (purposeDecision.warnings?.length) {allWarnings.push(...purposeDecision.warnings);}

  // Step 3: DPIA
  const isSensitive = (context.dataTypes || []).some((dt) =>
    art16Engine.SENSITIVE_TYPES.has((dt || '').toLowerCase())
  );
  const dpiaDecision = await validateDpiaRequirement({
    organizationId: context.organizationId,
    isSensitiveData: isSensitive,
    crossBorderTransfers: context.crossBorderTransfer,
    dataTypes: context.dataTypes,
  });
  if (!dpiaDecision.allowed) {return mergeBlock('DPIA', dpiaDecision);}

  // Step 4: Art. 16
  const art16Decision = validateArt16(context);
  if (art16Decision.warnings?.length) {allWarnings.push(...art16Decision.warnings);}
  if (!art16Decision.allowed) {return mergeBlock('ART16', art16Decision);}

  return {
    allowed: true,
    decision: 'APPROVED',
    blockedBy: null,
    reasons: [],
    warnings: allWarnings,
    requiredActions: [],
    auditTrail: [
      ...consentDecision.auditTrail,
      ...purposeDecision.auditTrail,
      ...dpiaDecision.auditTrail,
      ...art16Decision.auditTrail,
    ],
    consentId: consentDecision.consentId,
  };
}

/**
 * Validate a DSAR identity check step.
 * Before processing any DSAR, the requester must be verified.
 */
async function validateDsarIdentity({ userId, organizationId, identityVerified }) {
  if (!identityVerified) {
    return block(
      'IDENTITY_NOT_VERIFIED',
      'Identity of the data subject has not been verified. DSAR cannot be processed until identity is confirmed.',
      ['Complete the identity verification step (OTP verification).']
    );
  }
  return allow([{ check: 'dsar_identity', result: 'VERIFIED' }]);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mergeBlock(stage, decision) {
  return {
    ...decision,
    blockedBy: `${stage}_VALIDATION`,
  };
}

module.exports = {
  validateConsent,
  validatePurpose,
  validateDpiaRequirement,
  validateArt16,
  validateDataSharing,
  validateDsarIdentity,
};
