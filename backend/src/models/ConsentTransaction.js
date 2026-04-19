const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Consent Transaction — immutable record of a user's consent decision.
 * Each approve/reject/withdraw creates a NEW row. Never update existing rows.
 * Aligned with PDPL Art. 9 (proof of consent) and NCA ECC audit requirements.
 */
const ConsentTransaction = sequelize.define('ConsentTransaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  consentRequestId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'consent_requests', key: 'id' },
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  organizationId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Denormalized for fast querying without join',
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'withdrawn'),
    allowNull: false,
    defaultValue: 'pending',
  },
  previousStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'withdrawn'),
    allowNull: true,
    comment: 'Previous status for audit trail (on withdraw)',
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Optional reason for rejection or withdrawal',
  },
  respondedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'IP at time of consent — proof of consent per PDPL',
  },
  userAgent: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  consentVersion: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Version of the consent request text at time of response',
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Additional context: geolocation, device info, etc.',
  },
}, {
  tableName: 'consent_transactions',
  timestamps: true,
  // Prevent updates — consent records are immutable
  hooks: {
    beforeUpdate: () => {
      throw new Error('Consent transactions are immutable. Create a new transaction instead.');
    },
  },
  indexes: [
    { fields: ['userId'] },
    { fields: ['consentRequestId'] },
    { fields: ['organizationId'] },
    { fields: ['status'] },
    { fields: ['userId', 'consentRequestId'] },
    { fields: ['createdAt'] },
  ],
});

module.exports = ConsentTransaction;
