/**
 * Art. 16 Rule Engine — PDPL Art. 16 Prohibition Validation
 *
 * PDPL Art. 16 prohibits processing personal data that:
 *  1. Reveals racial or ethnic origin
 *  2. Reveals political opinions
 *  3. Reveals religious or philosophical beliefs
 *  4. Reveals trade-union membership
 *  5. Reveals genetic or biometric data for unique identification
 *  6. Reveals health data
 *  7. Reveals sexual orientation / gender identity
 *  8. Relates to criminal convictions
 *  9. Relates to minors without guardian consent
 * 10. Is used for a purpose incompatible with the original collection purpose
 * 11. Is shared with unauthorized parties
 * 12. Goes beyond what is necessary (data minimization violation)
 *
 * Each rule returns: { ruleId, violated: bool, reason, severity }
 * Engine returns: { allowed: bool, violations: [], recommendation }
 */

// ─── Sensitive data type definitions ─────────────────────────────────────────

const SENSITIVE_TYPES = new Set([
  'health_data', 'health', 'medical', 'diagnosis', 'prescription',
  'biometric', 'fingerprint', 'facial_data', 'retina',
  'genetic', 'dna',
  'racial', 'ethnic', 'race', 'ethnicity',
  'religious', 'religion', 'belief', 'faith',
  'political', 'political_opinion',
  'criminal_record', 'criminal', 'conviction',
  'sexual_orientation', 'gender_identity',
]);

const PROHIBITED_PURPOSES = new Set([
  'profiling_without_consent',
  'discriminatory_profiling',
  'surveillance_without_basis',
  'unauthorized_marketing',
  'data_brokering',
]);

const HIGH_RISK_PURPOSE_CATEGORIES = new Set([
  'research',
  'profiling',
  'automated_decision',
]);

// ─── Individual rule evaluators ───────────────────────────────────────────────

function ruleSensitiveDataRequiresExplicitConsent({ dataTypes, legalBasis, purposeCategory }) {
  const hasSensitive = dataTypes.some((dt) => SENSITIVE_TYPES.has(dt.toLowerCase()));
  if (!hasSensitive) {return { ruleId: 'ART16_R1', violated: false };}

  const validBases = ['explicit_consent', 'vital_interests', 'legal_obligation', 'medical_treatment', 'legal_claims', 'public_interest'];
  const isValidBasis = validBases.includes(legalBasis);

  return {
    ruleId: 'ART16_R1',
    article: 'PDPL Art. 16 §1',
    violated: !isValidBasis,
    reason: isValidBasis
      ? null
      : `Sensitive data (${dataTypes.filter((dt) => SENSITIVE_TYPES.has(dt.toLowerCase())).join(', ')}) requires explicit consent or a narrowly permitted legal basis. Provided basis "${legalBasis}" is not sufficient.`,
    severity: 'critical',
    requiredAction: isValidBasis ? null : 'Obtain explicit consent from the data subject or establish a valid Art. 16 legal basis.',
  };
}

function ruleProhibitedPurpose({ purpose, purposeCategory }) {
  const purposeLower = (purpose || '').toLowerCase();
  const hasProhibited = [...PROHIBITED_PURPOSES].some((p) => purposeLower.includes(p));
  const isHighRisk = HIGH_RISK_PURPOSE_CATEGORIES.has(purposeCategory);

  return {
    ruleId: 'ART16_R2',
    article: 'PDPL Art. 16 §2',
    violated: hasProhibited,
    reason: hasProhibited
      ? `The stated purpose contains a prohibited processing activity: "${purpose}".`
      : null,
    warning: isHighRisk
      ? `Purpose category "${purposeCategory}" is high-risk and requires enhanced safeguards.`
      : null,
    severity: 'critical',
    requiredAction: hasProhibited ? 'Revise the processing purpose to comply with PDPL Art. 5 (specific, explicit, legitimate).' : null,
  };
}

function ruleDataMinimization({ dataTypes, purposeCategory }) {
  // Flag if an excessive number of data types are requested for purpose
  const MINIMIZATION_THRESHOLDS = {
    identity_verification: 4,
    credit_scoring: 5,
    healthcare: 6,
    insurance: 5,
    employment: 5,
    government_service: 6,
    research: 4,
    fraud_prevention: 4,
    other: 3,
  };

  const threshold = MINIMIZATION_THRESHOLDS[purposeCategory] ?? 3;
  const exceeded = dataTypes.length > threshold;

  return {
    ruleId: 'ART16_R3',
    article: 'PDPL Art. 6 (Data Minimization)',
    violated: exceeded,
    reason: exceeded
      ? `${dataTypes.length} data types requested for purpose "${purposeCategory}" exceeds the minimization threshold of ${threshold}. Sharing: ${dataTypes.join(', ')}.`
      : null,
    severity: 'warning',
    requiredAction: exceeded ? `Reduce requested data types to the minimum necessary for "${purposeCategory}".` : null,
  };
}

function ruleMinorDataRequiresGuardianConsent({ dataTypes, legalBasis, metadata }) {
  const involvesMinors = dataTypes.some((dt) => dt.toLowerCase().includes('minor')) ||
    (metadata?.dataSubjectCategories || []).includes('minors');

  if (!involvesMinors) {return { ruleId: 'ART16_R4', violated: false };}

  const hasGuardianConsent = legalBasis === 'explicit_consent' && metadata?.guardianConsentVerified;

  return {
    ruleId: 'ART16_R4',
    article: 'PDPL Art. 16 §3 (Minor Data)',
    violated: !hasGuardianConsent,
    reason: !hasGuardianConsent
      ? 'Processing data of minors requires verified guardian consent.'
      : null,
    severity: 'critical',
    requiredAction: !hasGuardianConsent ? 'Verify and document guardian consent before processing minor data.' : null,
  };
}

function ruleCrossBorderTransferSafeguards({ crossBorderTransfer, transferSafeguards, destinationCountry }) {
  if (!crossBorderTransfer) {return { ruleId: 'ART16_R5', violated: false };}

  // KSA-approved countries (simplified — in production this would be a maintained list)
  const APPROVED_COUNTRIES = new Set(['sa', 'ae', 'kw', 'qa', 'bh', 'om', 'eg', 'jo']);
  const isApproved = destinationCountry
    ? APPROVED_COUNTRIES.has((destinationCountry || '').toLowerCase())
    : false;
  const hasSafeguards = !!(transferSafeguards && transferSafeguards.trim());

  const violated = !isApproved && !hasSafeguards;

  return {
    ruleId: 'ART16_R5',
    article: 'PDPL Art. 29 (Cross-Border Transfer)',
    violated,
    reason: violated
      ? `Cross-border transfer to "${destinationCountry || 'unspecified country'}" requires either an adequacy decision or documented safeguards. No safeguards provided.`
      : null,
    severity: 'critical',
    requiredAction: violated ? 'Document transfer safeguards (SCCs, adequacy decision, or SDAIA authorization) before proceeding.' : null,
  };
}

// ─── Main engine ──────────────────────────────────────────────────────────────

/**
 * Validate a data sharing or processing action against PDPL Art. 16.
 *
 * @param {Object} context
 * @param {string[]} context.dataTypes          - Data fields to be shared
 * @param {string}   context.legalBasis         - Legal basis for sharing
 * @param {string}   context.purpose            - Free-text purpose
 * @param {string}   context.purposeCategory    - Enum purpose category
 * @param {boolean}  [context.crossBorderTransfer]
 * @param {string}   [context.transferSafeguards]
 * @param {string}   [context.destinationCountry]
 * @param {Object}   [context.metadata]         - Additional context
 *
 * @returns {{ allowed: boolean, violations: Array, warnings: Array, recommendation: string }}
 */
function evaluate(context) {
  const rules = [
    ruleSensitiveDataRequiresExplicitConsent,
    ruleProhibitedPurpose,
    ruleDataMinimization,
    ruleMinorDataRequiresGuardianConsent,
    ruleCrossBorderTransferSafeguards,
  ];

  const violations = [];
  const warnings = [];

  for (const rule of rules) {
    const result = rule(context);

    if (result.violated) {
      violations.push({
        ruleId: result.ruleId,
        article: result.article,
        reason: result.reason,
        severity: result.severity,
        requiredAction: result.requiredAction,
      });
    }

    if (result.warning) {
      warnings.push({ ruleId: result.ruleId, article: result.article, warning: result.warning });
    }
  }

  const hasCritical = violations.some((v) => v.severity === 'critical');
  const allowed = violations.length === 0;

  return {
    allowed,
    decision: allowed ? 'APPROVED' : 'BLOCKED',
    violations,
    warnings,
    criticalViolationCount: hasCritical ? violations.filter((v) => v.severity === 'critical').length : 0,
    recommendation: allowed
      ? 'No Art. 16 violations detected. Proceed with standard safeguards.'
      : `BLOCKED — ${violations.length} violation(s) detected. All violations must be resolved before processing can proceed.`,
  };
}

module.exports = { evaluate, SENSITIVE_TYPES };
