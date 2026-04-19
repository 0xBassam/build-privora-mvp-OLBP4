const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * BreachIncident — Data Breach & Incident Management
 * PDPL Art. 19: Organizations must notify SDAIA within 72 hours of a breach,
 * and affected individuals must be notified without undue delay.
 */
const BreachIncident = sequelize.define('BreachIncident', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  // ── Ownership ─────────────────────────────────────────────────────────────────
  organizationId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'organizations', key: 'id' },
  },
  reportedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    comment: 'Admin who logged the incident',
  },

  // ── Incident Details ──────────────────────────────────────────────────────────
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  breachType: {
    type: DataTypes.ENUM(
      'unauthorized_access',
      'data_loss',
      'ransomware',
      'insider_threat',
      'system_compromise',
      'accidental_disclosure',
      'other'
    ),
    allowNull: false,
  },
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: false,
    defaultValue: 'medium',
  },
  affectedDataTypes: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'List of data categories affected (e.g. names, health, financial)',
    get() {
      const v = this.getDataValue('affectedDataTypes');
      if (Array.isArray(v)) {return v;}
      try { return JSON.parse(v); } catch { return []; }
    },
  },
  estimatedAffectedUsers: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Estimated number of data subjects affected',
  },

  // ── Status & Timeline ─────────────────────────────────────────────────────────
  status: {
    type: DataTypes.ENUM('open', 'investigating', 'contained', 'resolved'),
    defaultValue: 'open',
    allowNull: false,
  },
  discoveredAt: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'When the breach was first discovered',
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  actionsTaken: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of containment and remediation actions',
  },
  timeline: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of {timestamp, action, performedBy} timeline entries',
    get() {
      const v = this.getDataValue('timeline');
      if (Array.isArray(v)) {return v;}
      try { return JSON.parse(v); } catch { return []; }
    },
  },

  // ── Harm Assessment ───────────────────────────────────────────────────────────
  harmLevel: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: true,
    comment: 'Risk classification of harm to data subjects',
  },

  harmAssessment: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Structured harm assessment: { financialHarm, reputationalHarm, physicalHarm, identityTheft, discriminationRisk, explanation }',
  },

  notifyAuthorityRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether authority notification is legally required based on harm level',
  },

  notifyUsersRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether user notification is legally required based on harm level',
  },

  // ── Root Cause Analysis ────────────────────────────────────────────────────────
  rootCauseAnalysis: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'RCA: what caused the breach and how to prevent recurrence',
  },

  rootCauseCategory: {
    type: DataTypes.ENUM(
      'human_error', 'technical_failure', 'malicious_attack',
      'third_party_failure', 'process_failure', 'unknown'
    ),
    allowNull: true,
  },

  preventiveMeasures: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Measures taken or planned to prevent recurrence',
  },

  // ── Notifications (PDPL Art. 19) ──────────────────────────────────────────────
  notifiedAuthority: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether SDAIA has been notified (required within 72h)',
  },
  notifiedAuthorityAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  notifiedUsers: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether affected data subjects have been notified',
  },
  notifiedUsersAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  // ── 72h SLA ───────────────────────────────────────────────────────────────────
  authorityDeadline: {
    type: DataTypes.VIRTUAL,
    get() {
      if (!this.discoveredAt) {return null;}
      return new Date(new Date(this.discoveredAt).getTime() + 72 * 60 * 60 * 1000);
    },
  },
  isAuthorityOverdue: {
    type: DataTypes.VIRTUAL,
    get() {
      if (this.notifiedAuthority) {return false;}
      const deadline = new Date(new Date(this.discoveredAt).getTime() + 72 * 60 * 60 * 1000);
      return new Date() > deadline;
    },
  },
}, {
  tableName: 'breach_incidents',
  timestamps: true,
  indexes: [
    { fields: ['organizationId'] },
    { fields: ['status'] },
    { fields: ['severity'] },
    { fields: ['discoveredAt'] },
  ],
});

module.exports = BreachIncident;
