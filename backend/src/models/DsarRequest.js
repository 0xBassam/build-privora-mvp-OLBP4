const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * DsarRequest — Data Subject Access Request
 * Implements PDPL Art. 4 & 8: data subject rights including access, correction,
 * deletion, portability, and objection to processing.
 *
 * SLA: 30 days to respond (PDPL Art. 4).
 */
const DsarRequest = sequelize.define('DsarRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  // ── Case ID ───────────────────────────────────────────────────────────────────
  caseId: {
    type: DataTypes.STRING(30),
    allowNull: true,
    unique: true,
    comment: 'Human-readable case reference: PDPL-YYYY-NNNNN',
  },

  // ── Parties ──────────────────────────────────────────────────────────────────
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    comment: 'The data subject submitting the request',
  },
  organizationId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'organizations', key: 'id' },
    comment: 'The organization the request is directed at',
  },

  // ── Request Details ───────────────────────────────────────────────────────────
  requestType: {
    type: DataTypes.ENUM(
      'access',       // Right to access personal data
      'correction',   // Right to correct inaccurate data
      'deletion',     // Right to be forgotten
      'portability',  // Right to data portability
      'objection'     // Right to object to processing
    ),
    allowNull: false,
    comment: 'Type of data subject right being exercised',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'User description of what they are requesting',
  },

  // ── Status & Processing ───────────────────────────────────────────────────────
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'rejected'),
    defaultValue: 'pending',
    allowNull: false,
  },
  adminNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Internal notes added by the processing admin',
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  responseData: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Response provided to user (e.g. data export link, confirmation)',
  },
  processedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    comment: 'Admin who processed the request',
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  // ── Identity Verification ────────────────────────────────────────────────────
  identityVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether the data subject identity has been verified (OTP or document)',
  },

  identityVerifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  identityVerificationMethod: {
    type: DataTypes.ENUM('otp', 'document', 'in_person', 'digital_signature'),
    allowNull: true,
  },

  // ── Partial / Restricted Disclosure ─────────────────────────────────────────
  disclosureType: {
    type: DataTypes.ENUM('full', 'partial', 'restricted'),
    defaultValue: 'full',
    comment: 'Whether full or partial data is provided in the response',
  },

  restrictionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reason for partial or restricted disclosure (legal exemption etc.)',
  },

  restrictedFields: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Which specific fields were withheld from the response',
  },

  // ── SLA ───────────────────────────────────────────────────────────────────────
  slaDeadline: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'PDPL mandates 30-day response. Set at creation time.',
  },
  isOverdue: {
    type: DataTypes.VIRTUAL,
    get() {
      if (this.status === 'completed' || this.status === 'rejected') {return false;}
      return this.slaDeadline && new Date() > new Date(this.slaDeadline);
    },
  },
  daysRemaining: {
    type: DataTypes.VIRTUAL,
    get() {
      if (!this.slaDeadline) {return null;}
      const diff = new Date(this.slaDeadline) - new Date();
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    },
  },
}, {
  tableName: 'dsar_requests',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['organizationId'] },
    { fields: ['status'] },
    { fields: ['slaDeadline'] },
  ],
});

module.exports = DsarRequest;
