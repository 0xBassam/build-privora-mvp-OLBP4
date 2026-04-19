const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * PrivacyNotice — versioned privacy notice for an organization.
 * PDPL Art. 11: Controller must inform data subjects before processing.
 * Supports multi-version tracking and linking to consent requests.
 */
const PrivacyNotice = sequelize.define('PrivacyNotice', {
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

  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  version: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: '1.0',
    comment: 'Semantic version, e.g. "1.0", "2.1"',
  },

  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Only one version should be active at a time',
  },

  // ── Content Sections (PDPL Art. 11 fields) ────────────────────────────────
  purposeOfProcessing: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Plain-language explanation of why data is processed',
  },

  dataTypesCollected: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of data type strings collected',
    get() {
      const v = this.getDataValue('dataTypesCollected');
      if (Array.isArray(v)) {return v;}
      try { return JSON.parse(v); } catch { return []; }
    },
  },

  retentionSummary: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Human-readable retention period, e.g. "5 years from last use"',
  },

  thirdPartySharing: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  thirdPartyDetails: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Names/categories of third parties data is shared with',
  },

  dataSubjectRights: {
    type: DataTypes.JSONB,
    defaultValue: ['access', 'correction', 'deletion', 'portability', 'objection'],
    comment: 'Rights available to data subjects under this notice',
    get() {
      const v = this.getDataValue('dataSubjectRights');
      if (Array.isArray(v)) {return v;}
      try { return JSON.parse(v); } catch { return []; }
    },
  },

  contactEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'DPO or privacy contact email',
  },

  legalBasis: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  effectiveDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },

  // ── Versioning ────────────────────────────────────────────────────────────
  previousVersionId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'privacy_notices', key: 'id' },
    comment: 'Links to prior version for change tracking',
  },

  changeNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Summary of what changed from the previous version',
  },

  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
}, {
  tableName: 'privacy_notices',
  timestamps: true,
  indexes: [
    { fields: ['organizationId'] },
    { fields: ['isActive'] },
    { fields: ['organizationId', 'version'], unique: true },
  ],
});

module.exports = PrivacyNotice;
