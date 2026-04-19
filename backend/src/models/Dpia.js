const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * DPIA — Data Protection Impact Assessment
 * PDPL Art. 23 & NCA ECC — required for high-risk or sensitive data processing.
 * Must be completed before processing begins when risk is high.
 */
const Dpia = sequelize.define('Dpia', {
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

  // ── Core Info ────────────────────────────────────────────────────────────────
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },

  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Overview of the processing activity being assessed',
  },

  // ── Linked Records ───────────────────────────────────────────────────────────
  ropaRecordId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'FK to RoPA record this DPIA covers',
  },

  triggerReason: {
    type: DataTypes.ENUM(
      'sensitive_data',
      'large_scale_processing',
      'systematic_monitoring',
      'new_technology',
      'cross_border_transfer',
      'vulnerable_subjects',
      'manual_trigger'
    ),
    allowNull: false,
    comment: 'What triggered the need for this DPIA',
  },

  // ── Assessment Fields ────────────────────────────────────────────────────────
  necessityAssessment: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Is the processing necessary and proportionate to the purpose?',
  },

  proportionalityAssessment: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Does the processing go beyond what is needed?',
  },

  risksIdentified: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of identified risks: [{risk, likelihood, impact, rating}]',
  },

  mitigationMeasures: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of mitigation actions: [{measure, owner, targetDate, status}]',
  },

  residualRiskLevel: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: true,
    comment: 'Risk level after mitigations are applied',
  },

  overallRiskLevel: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: true,
    comment: 'Risk level before mitigations',
  },

  // ── DPO Consultation ─────────────────────────────────────────────────────────
  dpoConsultationRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  dpoConsultationDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  dpoRecommendation: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'DPO recommendations or objections',
  },

  dpoApproved: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    comment: 'null = pending, true = approved, false = rejected',
  },

  // ── Workflow ─────────────────────────────────────────────────────────────────
  status: {
    type: DataTypes.ENUM('draft', 'in_review', 'approved', 'rejected', 'requires_update'),
    defaultValue: 'draft',
  },

  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },

  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  reviewDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When this DPIA should next be reviewed',
  },

  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },

}, {
  tableName: 'dpias',
  timestamps: true,
  indexes: [
    { fields: ['organizationId'] },
    { fields: ['status'] },
    { fields: ['overallRiskLevel'] },
    { fields: ['ropaRecordId'] },
    { fields: ['organizationId', 'status'] },
  ],
});

module.exports = Dpia;
