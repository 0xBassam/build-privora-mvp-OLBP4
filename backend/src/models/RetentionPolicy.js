const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * RetentionPolicy — defines how long personal data should be kept per category/purpose.
 * PDPL Art. 18: Data must be destroyed or anonymized once its purpose is fulfilled.
 */
const RetentionPolicy = sequelize.define('RetentionPolicy', {
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
    comment: 'Human-readable policy name, e.g. "Health Data – 5 Year Policy"',
  },

  dataCategory: {
    type: DataTypes.ENUM(
      'pii', 'sensitive', 'financial', 'biometric', 'behavioral', 'location', 'general'
    ),
    allowNull: false,
    comment: 'Category of personal data this policy applies to',
  },

  purpose: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Optional: narrow policy to a specific processing purpose',
  },

  retentionDays: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'How many days data may be retained after consent/processing',
  },

  warningDays: {
    type: DataTypes.INTEGER,
    defaultValue: 30,
    comment: 'Days before expiry to generate an admin alert',
  },

  action: {
    type: DataTypes.ENUM('delete', 'anonymize', 'alert_only'),
    allowNull: false,
    defaultValue: 'alert_only',
    comment: 'Action to take when retention period expires',
  },

  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },

  lastRunAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last time this policy was evaluated against data records',
  },

  // ── Virtual: days until policy next triggers ──────────────────────────────
  retentionYears: {
    type: DataTypes.VIRTUAL,
    get() {
      return Math.round(this.retentionDays / 365 * 10) / 10;
    },
  },
}, {
  tableName: 'retention_policies',
  timestamps: true,
  indexes: [
    { fields: ['organizationId'] },
    { fields: ['dataCategory'] },
    { fields: ['isActive'] },
  ],
});

module.exports = RetentionPolicy;
