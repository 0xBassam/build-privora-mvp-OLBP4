const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * DestructionCertificate — Proof of data deletion or anonymization.
 * PDPL Art. 18 — data must be destroyed when retention period expires.
 * Certificate serves as auditable evidence of compliance.
 */
const DestructionCertificate = sequelize.define('DestructionCertificate', {
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

  // ── Certificate Reference ─────────────────────────────────────────────────────
  certificateNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Human-readable reference: DEST-YYYY-NNNNNN',
  },

  // ── What was destroyed ────────────────────────────────────────────────────────
  dataCategory: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: 'Category of data that was destroyed (e.g. health_data, financial)',
  },

  dataDescription: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Description of the specific data set destroyed',
  },

  recordCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Number of individual records destroyed',
  },

  // ── Linked resources ──────────────────────────────────────────────────────────
  retentionPolicyId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'FK to RetentionPolicy that triggered this destruction',
  },

  ropaRecordId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'FK to RoPA record this data belonged to',
  },

  // ── Destruction Details ───────────────────────────────────────────────────────
  destructionMethod: {
    type: DataTypes.ENUM('deletion', 'anonymization', 'pseudonymization', 'physical_destruction', 'cryptographic_erasure'),
    allowNull: false,
  },

  destructionScope: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Description of systems, databases, and backups covered by this destruction',
  },

  destructedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Exact timestamp of destruction',
  },

  destructionTrigger: {
    type: DataTypes.ENUM('retention_expiry', 'user_request', 'dsar_deletion', 'manual', 'legal_requirement'),
    allowNull: false,
    comment: 'What triggered this destruction event',
  },

  // ── Verification ──────────────────────────────────────────────────────────────
  verificationHash: {
    type: DataTypes.STRING(64),
    allowNull: false,
    comment: 'SHA-256 hash of certificate contents for tamper detection',
  },

  verifiedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    comment: 'Admin who verified the destruction',
  },

  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  // ── Legal compliance ──────────────────────────────────────────────────────────
  legalBasisForDestruction: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Legal reason requiring this destruction (e.g. PDPL Art. 18 retention expiry)',
  },

  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },

}, {
  tableName: 'destruction_certificates',
  timestamps: true,
  indexes: [
    { fields: ['organizationId'] },
    { fields: ['certificateNumber'], unique: true },
    { fields: ['destructionMethod'] },
    { fields: ['destructionTrigger'] },
    { fields: ['destructedAt'] },
    { fields: ['retentionPolicyId'] },
  ],
});

module.exports = DestructionCertificate;
