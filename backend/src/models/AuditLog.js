const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Audit Log — append-only, immutable record of all significant system actions.
 * NCA ECC compliant. PDPL Art. 20 (data protection officer oversight).
 */
const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  actorId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'User who performed the action (null for system actions)',
  },
  actorRole: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  organizationId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'e.g. CONSENT_APPROVED, CONSENT_WITHDRAWN, ADMIN_LOGIN, CONSENT_REQUEST_CREATED',
  },
  resourceType: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'e.g. ConsentTransaction, ConsentRequest, User',
  },
  resourceId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Structured extra data for the event',
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
  },
  userAgent: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  severity: {
    type: DataTypes.ENUM('info', 'warning', 'critical'),
    defaultValue: 'info',
  },
}, {
  tableName: 'audit_logs',
  timestamps: true,
  updatedAt: false, // Append-only — no updates allowed
  hooks: {
    beforeUpdate: () => {
      throw new Error('Audit logs are immutable.');
    },
    beforeDestroy: () => {
      throw new Error('Audit logs cannot be deleted.');
    },
  },
  indexes: [
    { fields: ['actorId'] },
    { fields: ['organizationId'] },
    { fields: ['action'] },
    { fields: ['resourceType', 'resourceId'] },
    { fields: ['createdAt'] },
    { fields: ['severity'] },
  ],
});

module.exports = AuditLog;
