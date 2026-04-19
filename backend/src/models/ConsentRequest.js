const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Consent Request — created by an organization, sent to users.
 * Aligned with PDPL Articles 5–7 (lawful basis, purpose, data types).
 */
const ConsentRequest = sequelize.define('ConsentRequest', {
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
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  titleAr: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Arabic title — PDPL requires Arabic language notices',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Plain-language explanation of what data is collected and why',
  },
  descriptionAr: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  dataTypes: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of data type strings, e.g. ["name","email","location"]',
  },
  purpose: {
    type: DataTypes.STRING(1000),
    allowNull: false,
    comment: 'PDPL Art. 6 — specific, explicit purpose for processing',
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
    defaultValue: 'consent',
    allowNull: false,
  },
  retentionPeriod: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'e.g. "2 years", "Until contract ends"',
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Consent auto-expires after this date',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  targetAudience: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Optional: array of user IDs or empty for all users',
  },
  privacyPolicyUrl: {
    type: DataTypes.STRING(1000),
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Admin user who created this request',
  },
}, {
  tableName: 'consent_requests',
  timestamps: true,
  indexes: [
    { fields: ['organizationId'] },
    { fields: ['isActive'] },
    { fields: ['createdBy'] },
    { fields: ['expiresAt'] },
  ],
});

module.exports = ConsentRequest;
