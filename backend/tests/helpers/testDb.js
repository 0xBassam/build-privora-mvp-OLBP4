/**
 * In-memory SQLite database for tests.
 * Replaces PostgreSQL so tests run without a real DB.
 */
const { Sequelize } = require('sequelize');

const testSequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
});

/**
 * Override the shared sequelize instance used by models.
 * Must be called before models are required.
 */
const setupTestDb = async () => {
  // Patch the database module to use SQLite
  const dbModule = require('../../src/config/database');
  Object.assign(dbModule, { sequelize: testSequelize });

  // Re-define all models on the test sequelize instance
  const { DataTypes } = require('sequelize');

  // ── User ──────────────────────────────────────────────────────────────────
  const bcrypt = require('bcryptjs');
  const User = testSequelize.define('User', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    name: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: true },
    role: { type: DataTypes.ENUM('user', 'org_admin', 'super_admin'), defaultValue: 'user' },
    organizationId: { type: DataTypes.UUID, allowNull: true },
    passwordHash: { type: DataTypes.STRING, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    isEmailVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true },
    preferredLanguage: { type: DataTypes.ENUM('en', 'ar'), defaultValue: 'en' },
  }, { tableName: 'users', timestamps: true });

  User.prototype.verifyPassword = async function (password) {
    if (!this.passwordHash) return false;
    return bcrypt.compare(password, this.passwordHash);
  };
  User.beforeSave(async (user) => {
    if (user.changed('passwordHash') && user.passwordHash && !user.passwordHash.startsWith('$2')) {
      user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
    }
  });
  User.prototype.toSafeJSON = function () {
    const { passwordHash, nationalId, ...safe } = this.toJSON();
    return safe;
  };

  // ── Organization ──────────────────────────────────────────────────────────
  const Organization = testSequelize.define('Organization', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    registrationNumber: { type: DataTypes.STRING, allowNull: true },
    contactEmail: { type: DataTypes.STRING, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { tableName: 'organizations', timestamps: true });

  // ── OtpCode ───────────────────────────────────────────────────────────────
  const OtpCode = testSequelize.define('OtpCode', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: { type: DataTypes.STRING, allowNull: false },
    codeHash: { type: DataTypes.STRING, allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    isUsed: { type: DataTypes.BOOLEAN, defaultValue: false },
    attempts: { type: DataTypes.INTEGER, defaultValue: 0 },
    ipAddress: { type: DataTypes.STRING, allowNull: true },
  }, { tableName: 'otp_codes', timestamps: true });

  // ── ConsentRequest ────────────────────────────────────────────────────────
  const ConsentRequest = testSequelize.define('ConsentRequest', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organizationId: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    dataTypes: { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]',
      get() { try { return JSON.parse(this.getDataValue('dataTypes')); } catch { return []; } },
      set(v) { this.setDataValue('dataTypes', JSON.stringify(v)); },
    },
    purpose: { type: DataTypes.STRING, allowNull: false },
    legalBasis: { type: DataTypes.STRING, defaultValue: 'consent' },
    retentionPeriod: { type: DataTypes.STRING, allowNull: true },
    expiresAt: { type: DataTypes.DATE, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    createdBy: { type: DataTypes.UUID, allowNull: false },
    privacyPolicyUrl: { type: DataTypes.STRING, allowNull: true },
  }, { tableName: 'consent_requests', timestamps: true });

  // ── ConsentTransaction ────────────────────────────────────────────────────
  const ConsentTransaction = testSequelize.define('ConsentTransaction', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    consentRequestId: { type: DataTypes.UUID, allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: false },
    organizationId: { type: DataTypes.UUID, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
    previousStatus: { type: DataTypes.STRING, allowNull: true },
    reason: { type: DataTypes.TEXT, allowNull: true },
    respondedAt: { type: DataTypes.DATE, allowNull: true },
    ipAddress: { type: DataTypes.STRING, allowNull: true },
    userAgent: { type: DataTypes.STRING, allowNull: true },
    metadata: { type: DataTypes.TEXT, defaultValue: '{}',
      get() { try { return JSON.parse(this.getDataValue('metadata')); } catch { return {}; } },
      set(v) { this.setDataValue('metadata', JSON.stringify(v)); },
    },
  }, { tableName: 'consent_transactions', timestamps: true });

  // ── AuditLog ──────────────────────────────────────────────────────────────
  const AuditLog = testSequelize.define('AuditLog', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    actorId: { type: DataTypes.UUID, allowNull: true },
    actorRole: { type: DataTypes.STRING, allowNull: true },
    organizationId: { type: DataTypes.UUID, allowNull: true },
    action: { type: DataTypes.STRING, allowNull: false },
    resourceType: { type: DataTypes.STRING, allowNull: true },
    resourceId: { type: DataTypes.UUID, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    metadata: { type: DataTypes.TEXT, defaultValue: '{}',
      get() { try { return JSON.parse(this.getDataValue('metadata')); } catch { return {}; } },
      set(v) { this.setDataValue('metadata', JSON.stringify(v)); },
    },
    ipAddress: { type: DataTypes.STRING, allowNull: true },
    userAgent: { type: DataTypes.STRING, allowNull: true },
    severity: { type: DataTypes.STRING, defaultValue: 'info' },
  }, { tableName: 'audit_logs', timestamps: true, updatedAt: false });

  // ── RefreshToken ──────────────────────────────────────────────────────────
  const RefreshToken = testSequelize.define('RefreshToken', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    tokenHash: { type: DataTypes.STRING, allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    isRevoked: { type: DataTypes.BOOLEAN, defaultValue: false },
    ipAddress: { type: DataTypes.STRING, allowNull: true },
    userAgent: { type: DataTypes.STRING, allowNull: true },
  }, { tableName: 'refresh_tokens', timestamps: true });

  // ── DataSharingRequest ────────────────────────────────────────────────────
  const DataSharingRequest = testSequelize.define('DataSharingRequest', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    requestingOrgId: { type: DataTypes.UUID, allowNull: false },
    providingOrgId: { type: DataTypes.UUID, allowNull: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    dataTypes: { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]',
      get() {
        const v = this.getDataValue('dataTypes');
        if (Array.isArray(v)) return v;
        try { return JSON.parse(v); } catch { return []; }
      },
      set(v) { this.setDataValue('dataTypes', Array.isArray(v) ? JSON.stringify(v) : v); },
    },
    purpose: { type: DataTypes.STRING, allowNull: false },
    purposeCategory: { type: DataTypes.STRING, defaultValue: 'other' },
    duration: { type: DataTypes.STRING, allowNull: false },
    legalBasis: { type: DataTypes.STRING, defaultValue: 'consent' },
    privacyNotice: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending_consent' },
    consentTransactionId: { type: DataTypes.UUID, allowNull: true },
    rejectionReason: { type: DataTypes.TEXT, allowNull: true },
    respondedAt: { type: DataTypes.DATE, allowNull: true },
    expiresAt: { type: DataTypes.DATE, allowNull: true },
    createdBy: { type: DataTypes.UUID, allowNull: false },
    metadata: { type: DataTypes.TEXT, defaultValue: '{}',
      get() { const v = this.getDataValue('metadata'); if (v && typeof v === 'object') return v; try { return JSON.parse(v); } catch { return {}; } },
      set(v) { this.setDataValue('metadata', typeof v === 'string' ? v : JSON.stringify(v)); },
    },
  }, { tableName: 'data_sharing_requests', timestamps: true });

  // ── DataSharingTransaction ────────────────────────────────────────────────
  const DataSharingTransaction = testSequelize.define('DataSharingTransaction', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    dataSharingRequestId: { type: DataTypes.UUID, allowNull: false },
    requestingOrgId: { type: DataTypes.UUID, allowNull: false },
    providingOrgId: { type: DataTypes.UUID, allowNull: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    consentTransactionId: { type: DataTypes.UUID, allowNull: true },
    dataTypesShared: { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]',
      get() {
        const v = this.getDataValue('dataTypesShared');
        if (Array.isArray(v)) return v;
        try { return JSON.parse(v); } catch { return []; }
      },
      set(v) { this.setDataValue('dataTypesShared', Array.isArray(v) ? JSON.stringify(v) : v); },
    },
    purpose: { type: DataTypes.STRING, allowNull: false },
    dataHash: { type: DataTypes.STRING, allowNull: true },
    sharedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    ipAddress: { type: DataTypes.STRING, allowNull: true },
    expiresAt: { type: DataTypes.DATE, allowNull: true },
    metadata: { type: DataTypes.TEXT, defaultValue: '{}',
      get() { try { return JSON.parse(this.getDataValue('metadata')); } catch { return {}; } },
      set(v) { this.setDataValue('metadata', JSON.stringify(v)); },
    },
  }, { tableName: 'data_sharing_transactions', timestamps: true, updatedAt: false });

  // ── DsarRequest ───────────────────────────────────────────────────────────
  const DsarRequest = testSequelize.define('DsarRequest', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    organizationId: { type: DataTypes.UUID, allowNull: false },
    requestType: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
    adminNotes: { type: DataTypes.TEXT, allowNull: true },
    responseData: { type: DataTypes.TEXT, allowNull: true },
    rejectionReason: { type: DataTypes.TEXT, allowNull: true },
    slaDeadline: { type: DataTypes.DATE, allowNull: false },
    processedAt: { type: DataTypes.DATE, allowNull: true },
    processedBy: { type: DataTypes.UUID, allowNull: true },
  }, {
    tableName: 'dsar_requests',
    timestamps: true,
    getterMethods: {
      isOverdue() {
        if (['completed', 'rejected'].includes(this.status)) return false;
        return this.slaDeadline ? new Date() > new Date(this.slaDeadline) : false;
      },
      daysRemaining() {
        if (['completed', 'rejected'].includes(this.status)) return null;
        if (!this.slaDeadline) return null;
        return Math.ceil((new Date(this.slaDeadline) - new Date()) / (1000 * 60 * 60 * 24));
      },
    },
  });

  // ── BreachIncident ────────────────────────────────────────────────────────
  const BreachIncident = testSequelize.define('BreachIncident', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organizationId: { type: DataTypes.UUID, allowNull: false },
    reportedBy: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    breachType: { type: DataTypes.STRING, allowNull: false },
    severity: { type: DataTypes.STRING, allowNull: false, defaultValue: 'medium' },
    affectedDataTypes: { type: DataTypes.TEXT, defaultValue: '[]',
      get() {
        const v = this.getDataValue('affectedDataTypes');
        if (Array.isArray(v)) return v;
        try { return JSON.parse(v); } catch { return []; }
      },
      set(v) { this.setDataValue('affectedDataTypes', Array.isArray(v) ? JSON.stringify(v) : v); },
    },
    estimatedAffectedUsers: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'open' },
    discoveredAt: { type: DataTypes.DATE, allowNull: false },
    resolvedAt: { type: DataTypes.DATE, allowNull: true },
    actionsTaken: { type: DataTypes.TEXT, allowNull: true },
    timeline: { type: DataTypes.TEXT, defaultValue: '[]',
      get() {
        const v = this.getDataValue('timeline');
        if (Array.isArray(v)) return v;
        try { return JSON.parse(v); } catch { return []; }
      },
      set(v) { this.setDataValue('timeline', Array.isArray(v) ? JSON.stringify(v) : v); },
    },
    notifiedAuthority: { type: DataTypes.BOOLEAN, defaultValue: false },
    notifiedAuthorityAt: { type: DataTypes.DATE, allowNull: true },
    notifiedUsers: { type: DataTypes.BOOLEAN, defaultValue: false },
    notifiedUsersAt: { type: DataTypes.DATE, allowNull: true },
  }, { tableName: 'breach_incidents', timestamps: true });

  // Associations
  User.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
  Organization.hasMany(User, { foreignKey: 'organizationId', as: 'members' });
  ConsentRequest.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
  ConsentRequest.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
  ConsentTransaction.belongsTo(ConsentRequest, { foreignKey: 'consentRequestId', as: 'consentRequest' });
  ConsentRequest.hasMany(ConsentTransaction, { foreignKey: 'consentRequestId', as: 'transactions' });
  ConsentTransaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  ConsentTransaction.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
  RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  DataSharingRequest.belongsTo(Organization, { foreignKey: 'requestingOrgId', as: 'requestingOrg' });
  DataSharingRequest.belongsTo(Organization, { foreignKey: 'providingOrgId', as: 'providingOrg' });
  DataSharingRequest.belongsTo(User, { foreignKey: 'userId', as: 'dataSubject' });
  DataSharingRequest.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
  DataSharingRequest.hasMany(DataSharingTransaction, { foreignKey: 'dataSharingRequestId', as: 'transactions' });
  DataSharingTransaction.belongsTo(DataSharingRequest, { foreignKey: 'dataSharingRequestId', as: 'request' });
  DataSharingTransaction.belongsTo(User, { foreignKey: 'userId', as: 'dataSubject' });

  // DsarRequest associations
  DsarRequest.belongsTo(User, { foreignKey: 'userId', as: 'dataSubject' });
  DsarRequest.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
  DsarRequest.belongsTo(User, { foreignKey: 'processedBy', as: 'processor' });
  Organization.hasMany(DsarRequest, { foreignKey: 'organizationId', as: 'dsarRequests' });

  // BreachIncident associations
  BreachIncident.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
  BreachIncident.belongsTo(User, { foreignKey: 'reportedBy', as: 'reporter' });
  Organization.hasMany(BreachIncident, { foreignKey: 'organizationId', as: 'breachIncidents' });

  // ── RetentionPolicy ───────────────────────────────────────────────────────
  const RetentionPolicy = testSequelize.define('RetentionPolicy', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organizationId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    dataCategory: { type: DataTypes.STRING, allowNull: false },
    purpose: { type: DataTypes.STRING, allowNull: true },
    retentionDays: { type: DataTypes.INTEGER, allowNull: false },
    warningDays: { type: DataTypes.INTEGER, defaultValue: 30 },
    action: { type: DataTypes.STRING, allowNull: false, defaultValue: 'alert_only' },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    lastRunAt: { type: DataTypes.DATE, allowNull: true },
  }, { tableName: 'retention_policies', timestamps: true });

  // ── PrivacyNotice ─────────────────────────────────────────────────────────
  const PrivacyNotice = testSequelize.define('PrivacyNotice', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organizationId: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    version: { type: DataTypes.STRING, allowNull: false, defaultValue: '1.0' },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    purposeOfProcessing: { type: DataTypes.TEXT, allowNull: false },
    dataTypesCollected: { type: DataTypes.TEXT, defaultValue: '[]',
      get() { const v = this.getDataValue('dataTypesCollected'); if (Array.isArray(v)) return v; try { return JSON.parse(v); } catch { return []; } },
      set(v) { this.setDataValue('dataTypesCollected', Array.isArray(v) ? JSON.stringify(v) : v); },
    },
    retentionSummary: { type: DataTypes.STRING, allowNull: true },
    thirdPartySharing: { type: DataTypes.BOOLEAN, defaultValue: false },
    thirdPartyDetails: { type: DataTypes.TEXT, allowNull: true },
    dataSubjectRights: { type: DataTypes.TEXT, defaultValue: '[]',
      get() { const v = this.getDataValue('dataSubjectRights'); if (Array.isArray(v)) return v; try { return JSON.parse(v); } catch { return []; } },
      set(v) { this.setDataValue('dataSubjectRights', Array.isArray(v) ? JSON.stringify(v) : v); },
    },
    contactEmail: { type: DataTypes.STRING, allowNull: true },
    legalBasis: { type: DataTypes.STRING, allowNull: true },
    effectiveDate: { type: DataTypes.DATEONLY, allowNull: true },
    previousVersionId: { type: DataTypes.UUID, allowNull: true },
    changeNotes: { type: DataTypes.TEXT, allowNull: true },
    createdBy: { type: DataTypes.UUID, allowNull: false },
  }, { tableName: 'privacy_notices', timestamps: true });

  // ── ProcessingPurpose ─────────────────────────────────────────────────────
  const ProcessingPurpose = testSequelize.define('ProcessingPurpose', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    organizationId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    legalBasis: { type: DataTypes.STRING, allowNull: false },
    dataCategories: { type: DataTypes.TEXT, defaultValue: '[]',
      get() { const v = this.getDataValue('dataCategories'); if (Array.isArray(v)) return v; try { return JSON.parse(v); } catch { return []; } },
      set(v) { this.setDataValue('dataCategories', Array.isArray(v) ? JSON.stringify(v) : v); },
    },
    allowedDataTypes: { type: DataTypes.TEXT, defaultValue: '[]',
      get() { const v = this.getDataValue('allowedDataTypes'); if (Array.isArray(v)) return v; try { return JSON.parse(v); } catch { return []; } },
      set(v) { this.setDataValue('allowedDataTypes', Array.isArray(v) ? JSON.stringify(v) : v); },
    },
    retentionDays: { type: DataTypes.INTEGER, allowNull: true },
    requiresExplicitConsent: { type: DataTypes.BOOLEAN, defaultValue: true },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    createdBy: { type: DataTypes.UUID, allowNull: false },
  }, { tableName: 'processing_purposes', timestamps: true });

  // Phase 2B associations
  RetentionPolicy.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
  PrivacyNotice.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
  PrivacyNotice.belongsTo(User, { foreignKey: 'createdBy', as: 'author' });
  ProcessingPurpose.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
  ProcessingPurpose.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

  // Patch models module
  const modelsModule = require('../../src/models');
  Object.assign(modelsModule, {
    User, Organization, OtpCode, ConsentRequest,
    ConsentTransaction, AuditLog, RefreshToken,
    DataSharingRequest, DataSharingTransaction,
    DsarRequest, BreachIncident,
    RetentionPolicy, PrivacyNotice, ProcessingPurpose,
  });

  await testSequelize.sync({ force: true });
  return {
    User, Organization, OtpCode, ConsentRequest,
    ConsentTransaction, AuditLog, RefreshToken,
    DataSharingRequest, DataSharingTransaction,
    DsarRequest, BreachIncident,
    RetentionPolicy, PrivacyNotice, ProcessingPurpose,
  };
};

const closeTestDb = async () => {
  await testSequelize.close();
};

module.exports = { setupTestDb, closeTestDb, testSequelize };
