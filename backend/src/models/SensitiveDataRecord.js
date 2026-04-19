const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * SensitiveDataRecord — tracks all sensitive personal data processing.
 * PDPL Art. 23 — sensitive data requires explicit consent and heightened protections.
 * Categories: health, biometric, genetic, racial/ethnic, religious/political,
 *             criminal records, financial.
 */
const SensitiveDataRecord = sequelize.define('SensitiveDataRecord', {
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

  // ── Classification ───────────────────────────────────────────────────────────
  dataType: {
    type: DataTypes.ENUM(
      'health',
      'biometric',
      'genetic',
      'racial_ethnic',
      'religious',
      'political',
      'criminal_records',
      'financial',
      'minor_data',
      'other_sensitive'
    ),
    allowNull: false,
    comment: 'PDPL Art. 23 sensitive data category',
  },

  dataTypeDescription: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Specific description of what sensitive data is processed',
  },

  // ── Purpose & Legal Basis ────────────────────────────────────────────────────
  processingPurpose: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Specific purpose — must be more specific than general processing',
  },

  legalBasis: {
    type: DataTypes.ENUM(
      'explicit_consent',
      'vital_interests',
      'legal_obligation',
      'public_interest',
      'legal_claims',
      'medical_treatment'
    ),
    allowNull: false,
    comment: 'PDPL Art. 23 — stricter legal basis required for sensitive data',
  },

  // ── Consent Linkage ──────────────────────────────────────────────────────────
  consentRequestId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'FK to ConsentRequest if legalBasis is explicit_consent',
  },

  // ── DPIA ─────────────────────────────────────────────────────────────────────
  dpiaRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Sensitive data processing almost always requires a DPIA',
  },

  dpiaId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'FK to completed DPIA record',
  },

  dpiaStatus: {
    type: DataTypes.ENUM('not_started', 'in_progress', 'completed', 'not_required'),
    defaultValue: 'not_started',
  },

  // ── Safeguards ───────────────────────────────────────────────────────────────
  safeguards: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Technical and organisational safeguards protecting this data',
  },

  accessControls: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Who has access and how access is restricted',
  },

  encryptionApplied: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether encryption is applied to this data',
  },

  pseudonymizationApplied: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  // ── Volume ───────────────────────────────────────────────────────────────────
  estimatedRecords: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Estimated number of sensitive data records processed',
  },

  // ── Workflow ─────────────────────────────────────────────────────────────────
  status: {
    type: DataTypes.ENUM('active', 'suspended', 'discontinued'),
    defaultValue: 'active',
  },

  reviewDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When this record should next be reviewed',
  },

  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },

}, {
  tableName: 'sensitive_data_records',
  timestamps: true,
  indexes: [
    { fields: ['organizationId'] },
    { fields: ['dataType'] },
    { fields: ['legalBasis'] },
    { fields: ['dpiaRequired'] },
    { fields: ['status'] },
    { fields: ['organizationId', 'status'] },
  ],
});

module.exports = SensitiveDataRecord;
