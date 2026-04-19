const User = require('./User');
const Organization = require('./Organization');
const OtpCode = require('./OtpCode');
const ConsentRequest = require('./ConsentRequest');
const ConsentTransaction = require('./ConsentTransaction');
const DataSharingRequest = require('./DataSharingRequest');
const DataSharingTransaction = require('./DataSharingTransaction');
const AuditLog = require('./AuditLog');
const RefreshToken = require('./RefreshToken');
const DsarRequest = require('./DsarRequest');
const BreachIncident = require('./BreachIncident');
const RetentionPolicy = require('./RetentionPolicy');
const PrivacyNotice = require('./PrivacyNotice');
const ProcessingPurpose = require('./ProcessingPurpose');
const RopaRecord = require('./RopaRecord');
const Dpia = require('./Dpia');
const SensitiveDataRecord = require('./SensitiveDataRecord');
const DisclosureRecord = require('./DisclosureRecord');
const DestructionCertificate = require('./DestructionCertificate');

// ─── Associations ─────────────────────────────────────────────────────────────

// User <-> Organization
User.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Organization.hasMany(User, { foreignKey: 'organizationId', as: 'members' });

// ConsentRequest <-> Organization
ConsentRequest.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Organization.hasMany(ConsentRequest, { foreignKey: 'organizationId', as: 'consentRequests' });

// ConsentRequest <-> User (creator)
ConsentRequest.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// ConsentTransaction <-> ConsentRequest
ConsentTransaction.belongsTo(ConsentRequest, { foreignKey: 'consentRequestId', as: 'consentRequest' });
ConsentRequest.hasMany(ConsentTransaction, { foreignKey: 'consentRequestId', as: 'transactions' });

// ConsentTransaction <-> User
ConsentTransaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(ConsentTransaction, { foreignKey: 'userId', as: 'consentTransactions' });

// ConsentTransaction <-> Organization
ConsentTransaction.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

// DataSharingRequest <-> Organizations
DataSharingRequest.belongsTo(Organization, { foreignKey: 'requestingOrgId', as: 'requestingOrg' });
DataSharingRequest.belongsTo(Organization, { foreignKey: 'providingOrgId', as: 'providingOrg' });
Organization.hasMany(DataSharingRequest, { foreignKey: 'requestingOrgId', as: 'outgoingSharingRequests' });
Organization.hasMany(DataSharingRequest, { foreignKey: 'providingOrgId', as: 'incomingSharingRequests' });

// DataSharingRequest <-> User
DataSharingRequest.belongsTo(User, { foreignKey: 'userId', as: 'dataSubject' });
User.hasMany(DataSharingRequest, { foreignKey: 'userId', as: 'dataSharingRequests' });

// DataSharingRequest <-> User (creator)
DataSharingRequest.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// DataSharingRequest <-> DataSharingTransaction
DataSharingRequest.hasMany(DataSharingTransaction, { foreignKey: 'dataSharingRequestId', as: 'transactions' });
DataSharingTransaction.belongsTo(DataSharingRequest, { foreignKey: 'dataSharingRequestId', as: 'request' });

// DataSharingTransaction <-> User
DataSharingTransaction.belongsTo(User, { foreignKey: 'userId', as: 'dataSubject' });

// RefreshToken <-> User
RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });

// DsarRequest <-> User (data subject)
DsarRequest.belongsTo(User, { foreignKey: 'userId', as: 'dataSubject' });
User.hasMany(DsarRequest, { foreignKey: 'userId', as: 'dsarRequests' });

// DsarRequest <-> Organization
DsarRequest.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Organization.hasMany(DsarRequest, { foreignKey: 'organizationId', as: 'dsarRequests' });

// DsarRequest <-> User (processor)
DsarRequest.belongsTo(User, { foreignKey: 'processedBy', as: 'processor' });

// BreachIncident <-> Organization
BreachIncident.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Organization.hasMany(BreachIncident, { foreignKey: 'organizationId', as: 'breachIncidents' });

// BreachIncident <-> User (reporter)
BreachIncident.belongsTo(User, { foreignKey: 'reportedBy', as: 'reporter' });

// RetentionPolicy <-> Organization
RetentionPolicy.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Organization.hasMany(RetentionPolicy, { foreignKey: 'organizationId', as: 'retentionPolicies' });

// PrivacyNotice <-> Organization
PrivacyNotice.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Organization.hasMany(PrivacyNotice, { foreignKey: 'organizationId', as: 'privacyNotices' });

// PrivacyNotice <-> User (author)
PrivacyNotice.belongsTo(User, { foreignKey: 'createdBy', as: 'author' });

// ProcessingPurpose <-> Organization
ProcessingPurpose.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Organization.hasMany(ProcessingPurpose, { foreignKey: 'organizationId', as: 'processingPurposes' });

// ProcessingPurpose <-> User (creator)
ProcessingPurpose.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// RopaRecord <-> Organization
RopaRecord.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Organization.hasMany(RopaRecord, { foreignKey: 'organizationId', as: 'ropaRecords' });

// RopaRecord <-> User (creator)
RopaRecord.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// RopaRecord <-> User (approver)
RopaRecord.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

// Dpia <-> Organization
Dpia.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Organization.hasMany(Dpia, { foreignKey: 'organizationId', as: 'dpias' });

// Dpia <-> RopaRecord
Dpia.belongsTo(RopaRecord, { foreignKey: 'ropaRecordId', as: 'ropaRecord' });
RopaRecord.hasMany(Dpia, { foreignKey: 'ropaRecordId', as: 'dpias' });

// Dpia <-> User (creator)
Dpia.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// Dpia <-> User (approver)
Dpia.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

// SensitiveDataRecord <-> Organization
SensitiveDataRecord.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Organization.hasMany(SensitiveDataRecord, { foreignKey: 'organizationId', as: 'sensitiveDataRecords' });

// SensitiveDataRecord <-> User (creator)
SensitiveDataRecord.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// DisclosureRecord <-> Organization
DisclosureRecord.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Organization.hasMany(DisclosureRecord, { foreignKey: 'organizationId', as: 'disclosureRecords' });

// DisclosureRecord <-> DataSharingRequest
DisclosureRecord.belongsTo(DataSharingRequest, { foreignKey: 'dataSharingRequestId', as: 'dataSharingRequest' });

// DisclosureRecord <-> User (creator)
DisclosureRecord.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// DestructionCertificate <-> Organization
DestructionCertificate.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Organization.hasMany(DestructionCertificate, { foreignKey: 'organizationId', as: 'destructionCertificates' });

// DestructionCertificate <-> User (creator)
DestructionCertificate.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// DestructionCertificate <-> User (verifier)
DestructionCertificate.belongsTo(User, { foreignKey: 'verifiedBy', as: 'verifier' });

module.exports = {
  User,
  Organization,
  OtpCode,
  ConsentRequest,
  ConsentTransaction,
  DataSharingRequest,
  DataSharingTransaction,
  AuditLog,
  RefreshToken,
  DsarRequest,
  BreachIncident,
  RetentionPolicy,
  PrivacyNotice,
  ProcessingPurpose,
  RopaRecord,
  Dpia,
  SensitiveDataRecord,
  DisclosureRecord,
  DestructionCertificate,
};
