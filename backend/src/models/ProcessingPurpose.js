const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * ProcessingPurpose — purpose registry for data processing activities.
 * PDPL Art. 6: Purpose must be specific, explicit, and legitimate.
 * Art. 5: Data collected must be limited to what is necessary (minimization).
 */
const ProcessingPurpose = sequelize.define('ProcessingPurpose', {
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

  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Short purpose name, e.g. "Medical Diagnosis", "Credit Scoring"',
  },

  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Detailed explanation of the purpose',
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
  },

  // ── Data Classification ───────────────────────────────────────────────────
  dataCategories: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Allowed data categories: pii, sensitive, financial, biometric, behavioral, location',
    get() {
      const v = this.getDataValue('dataCategories');
      if (Array.isArray(v)) {return v;}
      try { return JSON.parse(v); } catch { return []; }
    },
  },

  allowedDataTypes: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Specific data fields approved for this purpose (data minimization)',
    get() {
      const v = this.getDataValue('allowedDataTypes');
      if (Array.isArray(v)) {return v;}
      try { return JSON.parse(v); } catch { return []; }
    },
  },

  // ── Policy ────────────────────────────────────────────────────────────────
  retentionDays: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Recommended retention period in days for data processed under this purpose',
  },

  requiresExplicitConsent: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether explicit opt-in consent is needed (sensitive data always = true)',
  },

  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },

  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
}, {
  tableName: 'processing_purposes',
  timestamps: true,
  indexes: [
    { fields: ['organizationId'] },
    { fields: ['isActive'] },
    { fields: ['legalBasis'] },
  ],
});

module.exports = ProcessingPurpose;
