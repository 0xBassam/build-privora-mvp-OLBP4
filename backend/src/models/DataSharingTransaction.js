const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * DataSharingTransaction — immutable record of each data sharing event.
 * Created once when data is actually transferred between entities.
 * Never updated or deleted (NCA ECC + PDPL audit requirements).
 */
const DataSharingTransaction = sequelize.define('DataSharingTransaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  dataSharingRequestId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'data_sharing_requests', key: 'id' },
  },
  requestingOrgId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Denormalized — Entity X that received the data',
  },
  providingOrgId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Denormalized — Entity Y that provided the data',
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Data subject — whose data was shared',
  },
  consentTransactionId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'The consent record that authorized this sharing',
  },

  // ── What was shared ──────────────────────────────────────────────────────────
  dataTypesShared: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'Exact fields shared (data minimization log)',
  },
  purpose: {
    type: DataTypes.STRING(1000),
    allowNull: false,
    comment: 'Purpose at time of sharing (point-in-time snapshot)',
  },
  dataHash: {
    type: DataTypes.STRING(64),
    allowNull: true,
    comment: 'SHA-256 hash of shared payload for integrity verification',
  },

  // ── Provenance ────────────────────────────────────────────────────────────────
  sharedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the receiving entity must delete this data',
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
}, {
  tableName: 'data_sharing_transactions',
  timestamps: true,
  updatedAt: false,
  hooks: {
    beforeUpdate: () => {
      throw new Error('Data sharing transactions are immutable.');
    },
    beforeDestroy: () => {
      throw new Error('Data sharing transactions cannot be deleted.');
    },
  },
  indexes: [
    { fields: ['dataSharingRequestId'] },
    { fields: ['userId'] },
    { fields: ['requestingOrgId'] },
    { fields: ['sharedAt'] },
  ],
});

module.exports = DataSharingTransaction;
