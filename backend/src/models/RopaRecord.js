const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * RoPA — Records of Processing Activities
 * PDPL Art. 12 & 28 — mandatory registry of all personal data processing activities.
 * Every processing activity must be registered BEFORE it begins.
 * DPO is responsible for maintaining this register.
 */
const RopaRecord = sequelize.define('RopaRecord', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  organizationId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'organizations', key: 'id' },
  },

  // ── Core Activity Info ───────────────────────────────────────────────────────
  activityName: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: 'Name of the processing activity, e.g. "Customer Onboarding Data Collection"',
  },

  activityDescription: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Detailed description of what processing takes place',
  },

  department: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Department responsible for this processing activity',
  },

  // ── PDPL Required Fields ─────────────────────────────────────────────────────
  processingPurpose: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'PDPL Art. 6 — specific, explicit, legitimate purpose',
  },

  legalBasis: {
    type: DataTypes.ENUM(
      'consent',
      'contract',
      'legal_obligation',
      'vital_interests',
      'public_task',
      'legitimate_interests'
    ),
    allowNull: false,
    comment: 'PDPL Art. 5 — lawful basis for processing',
  },

  dataCategories: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Categories of personal data processed, e.g. ["name","email","health_data"]',
  },

  isSensitiveData: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'True if processing includes sensitive data (PDPL Art. 23)',
  },

  dataSubjectCategories: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Categories of data subjects, e.g. ["customers","employees","minors"]',
  },

  estimatedDataSubjects: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Estimated number of individuals whose data is processed',
  },

  // ── Third Parties & Transfers ────────────────────────────────────────────────
  recipientCategories: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Third parties or categories of recipients who receive the data',
  },

  thirdPartyTransfers: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether data is transferred to third parties',
  },

  crossBorderTransfers: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'PDPL Art. 29 — whether data is transferred outside Saudi Arabia',
  },

  transferSafeguards: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Safeguards in place for cross-border transfers',
  },

  // ── Retention ────────────────────────────────────────────────────────────────
  retentionPeriod: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'How long data is retained, e.g. "5 years after contract end"',
  },

  retentionJustification: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Why this retention period is justified',
  },

  // ── Security & Risk ──────────────────────────────────────────────────────────
  securityMeasures: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Technical and organizational security measures in place',
  },

  dpiaRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether a DPIA is required for this processing activity',
  },

  dpiaId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'FK to DPIA record if assessment has been completed',
  },

  // ── Workflow ─────────────────────────────────────────────────────────────────
  status: {
    type: DataTypes.ENUM('draft', 'active', 'under_review', 'archived'),
    defaultValue: 'draft',
    comment: 'Lifecycle status of this RoPA record',
  },

  ownerRole: {
    type: DataTypes.ENUM('dpo', 'it_admin', 'org_admin', 'legal'),
    defaultValue: 'org_admin',
    comment: 'Role responsible for this processing activity',
  },

  ownerName: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Name of the person responsible',
  },

  lastReviewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When this record was last reviewed for accuracy',
  },

  nextReviewDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Scheduled next review date',
  },

  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },

  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },

}, {
  tableName: 'ropa_records',
  timestamps: true,
  indexes: [
    { fields: ['organizationId'] },
    { fields: ['status'] },
    { fields: ['legalBasis'] },
    { fields: ['isSensitiveData'] },
    { fields: ['dpiaRequired'] },
    { fields: ['organizationId', 'status'] },
  ],
});

module.exports = RopaRecord;
