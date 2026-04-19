const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * DisclosureRecord — Central register of all data disclosure / sharing activities.
 * PDPL Art. 5, 6, 9, 25 — every sharing event must be pre-registered and auditable.
 *
 * Must be created BEFORE data sharing is executed.
 * Linked to DataSharingRequest and DataSharingTransaction.
 */
const DisclosureRecord = sequelize.define('DisclosureRecord', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  organizationId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'organizations', key: 'id' },
    comment: 'Organization disclosing the data',
  },

  // ── Linked Request ────────────────────────────────────────────────────────────
  dataSharingRequestId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'FK to DataSharingRequest that triggered this disclosure',
  },

  dataSharingTransactionId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'FK to DataSharingTransaction after execution',
  },

  // ── Entities ──────────────────────────────────────────────────────────────────
  disclosingEntity: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: 'Name of organization or system disclosing data',
  },

  receivingEntity: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: 'Name of organization or individual receiving data',
  },

  receivingEntityType: {
    type: DataTypes.ENUM('organization', 'government_body', 'individual', 'third_party', 'international'),
    defaultValue: 'organization',
    allowNull: false,
  },

  // ── Disclosure Details ────────────────────────────────────────────────────────
  purpose: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Specific purpose of this data disclosure — PDPL Art. 6',
  },

  purposeCategory: {
    type: DataTypes.ENUM(
      'identity_verification', 'credit_scoring', 'healthcare',
      'insurance', 'employment', 'government_service',
      'research', 'fraud_prevention', 'other'
    ),
    defaultValue: 'other',
    allowNull: false,
  },

  dataCategories: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Categories of personal data disclosed',
  },

  dataFields: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Specific data fields disclosed (data minimization evidence)',
  },

  estimatedRecords: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Number of data subjects affected by this disclosure',
  },

  // ── Legal Basis ───────────────────────────────────────────────────────────────
  legalBasis: {
    type: DataTypes.ENUM(
      'consent', 'contract', 'legal_obligation',
      'vital_interests', 'public_task', 'legitimate_interests'
    ),
    allowNull: false,
  },

  consentReference: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reference to consent transaction ID or consent mechanism',
  },

  // ── Art. 16 Clearance ─────────────────────────────────────────────────────────
  art16ClearanceResult: {
    type: DataTypes.ENUM('approved', 'blocked', 'not_evaluated'),
    defaultValue: 'not_evaluated',
    comment: 'Result of Art. 16 validation engine',
  },

  art16Violations: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Any Art. 16 violations detected (stored even if later resolved)',
  },

  policyDecision: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Full policy engine decision object stored for audit',
  },

  // ── Cross-Border ──────────────────────────────────────────────────────────────
  isCrossBorder: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  destinationCountry: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },

  transferSafeguards: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'PDPL Art. 29 transfer safeguards description',
  },

  // ── Retention ─────────────────────────────────────────────────────────────────
  retentionPeriod: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'How long the receiving party may retain the data',
  },

  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When this disclosure authority expires',
  },

  // ── Status ────────────────────────────────────────────────────────────────────
  status: {
    type: DataTypes.ENUM('pending', 'active', 'executed', 'expired', 'revoked'),
    defaultValue: 'pending',
    allowNull: false,
  },

  revokedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  revokedReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  // ── Data Hash (integrity) ─────────────────────────────────────────────────────
  dataHash: {
    type: DataTypes.STRING(64),
    allowNull: true,
    comment: 'SHA-256 hash of disclosed data for integrity verification',
  },

  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },

}, {
  tableName: 'disclosure_records',
  timestamps: true,
  indexes: [
    { fields: ['organizationId'] },
    { fields: ['status'] },
    { fields: ['dataSharingRequestId'] },
    { fields: ['art16ClearanceResult'] },
    { fields: ['isCrossBorder'] },
    { fields: ['organizationId', 'status'] },
  ],
});

module.exports = DisclosureRecord;
