const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * DataSharingRequest — Entity X requests data about a user from Entity Y.
 * Core of the Data Sharing Gateway (PDPL Art. 5, 6, 9, 25).
 *
 * Lifecycle:
 *   pending_consent → user approves → consent_approved → data shared → completed
 *                                  → user rejects → rejected
 *   OR if consent already exists → consent_approved immediately → completed
 */
const DataSharingRequest = sequelize.define('DataSharingRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  // ── Entities ────────────────────────────────────────────────────────────────
  requestingOrgId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'organizations', key: 'id' },
    comment: 'Entity X — the organization requesting access to data',
  },
  providingOrgId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'organizations', key: 'id' },
    comment: 'Entity Y — the organization holding the data (null = user-held)',
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    comment: 'The data subject whose data is being requested',
  },

  // ── Request Details ──────────────────────────────────────────────────────────
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: 'Human-readable summary of the data sharing request',
  },
  dataTypes: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Minimal set of data fields requested (data minimization principle)',
  },
  purpose: {
    type: DataTypes.STRING(1000),
    allowNull: false,
    comment: 'PDPL Art. 6 — specific purpose for which data will be used',
  },
  purposeCategory: {
    type: DataTypes.ENUM(
      'identity_verification',
      'credit_scoring',
      'healthcare',
      'insurance',
      'employment',
      'government_service',
      'research',
      'fraud_prevention',
      'other'
    ),
    allowNull: false,
    defaultValue: 'other',
  },
  duration: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'How long the data will be retained/used, e.g. "30 days"',
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Request auto-expires if user does not respond by this date',
  },

  // ── Status & Consent Linkage ─────────────────────────────────────────────────
  status: {
    type: DataTypes.ENUM(
      'pending_consent',   // Waiting for user to approve/reject
      'consent_approved',  // User approved — ready to share data
      'completed',         // Data has been shared
      'rejected',          // User rejected the request
      'expired',           // Request expired without response
      'revoked'            // Sharing was revoked after completion
    ),
    allowNull: false,
    defaultValue: 'pending_consent',
  },
  consentTransactionId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'FK to the ConsentTransaction that authorized this sharing',
  },

  // ── Privacy & Legal ──────────────────────────────────────────────────────────
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
  privacyNotice: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'PDPL requires a privacy notice displayed before consent',
  },

  // ── Rejection / Revocation ───────────────────────────────────────────────────
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  respondedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Admin user who created this request',
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
}, {
  tableName: 'data_sharing_requests',
  timestamps: true,
  indexes: [
    { fields: ['requestingOrgId'] },
    { fields: ['providingOrgId'] },
    { fields: ['userId'] },
    { fields: ['status'] },
    { fields: ['userId', 'status'] },
    { fields: ['createdAt'] },
  ],
});

module.exports = DataSharingRequest;
