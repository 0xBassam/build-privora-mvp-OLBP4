const crypto = require('crypto');
const { DestructionCertificate } = require('../models');
const { createAuditLog, getClientIp } = require('../middleware/audit');
const { success, created, notFound, forbidden, badRequest } = require('../utils/response');

// ── Certificate number generator: DEST-YYYY-NNNNNN ──────────────────────────
async function generateCertificateNumber() {
  const year = new Date().getFullYear();
  const prefix = `DEST-${year}-`;

  // Count existing certs this year to get next sequence
  const count = await DestructionCertificate.count({
    where: { certificateNumber: { [require('sequelize').Op.like]: `${prefix}%` } },
  });

  const seq = String(count + 1).padStart(6, '0');
  return `${prefix}${seq}`;
}

// ── SHA-256 verification hash of certificate contents ───────────────────────
function buildVerificationHash(fields) {
  const payload = JSON.stringify(fields, Object.keys(fields).sort());
  return crypto.createHash('sha256').update(payload).digest('hex');
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/destruction/certificates
 * Issue a new destruction certificate (proof of data deletion / anonymization).
 * PDPL Art. 18.
 */
const createCertificate = async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {return forbidden(res, 'No organization associated');}

  const {
    dataCategory, dataDescription, recordCount,
    destructionMethod, destructionScope, destructedAt,
    destructionTrigger, legalBasisForDestruction,
    retentionPolicyId, ropaRecordId, notes,
  } = req.body;

  const certificateNumber = await generateCertificateNumber();

  const hashPayload = {
    certificateNumber,
    organizationId: orgId,
    dataCategory,
    dataDescription,
    destructionMethod,
    destructionScope,
    destructedAt: destructedAt || new Date().toISOString(),
    destructionTrigger,
    createdBy: req.user.id,
  };
  const verificationHash = buildVerificationHash(hashPayload);

  const certificate = await DestructionCertificate.create({
    organizationId: orgId,
    certificateNumber,
    dataCategory,
    dataDescription,
    recordCount: recordCount || null,
    retentionPolicyId: retentionPolicyId || null,
    ropaRecordId: ropaRecordId || null,
    destructionMethod,
    destructionScope,
    destructedAt: destructedAt ? new Date(destructedAt) : new Date(),
    destructionTrigger,
    verificationHash,
    legalBasisForDestruction: legalBasisForDestruction || null,
    notes: notes || null,
    createdBy: req.user.id,
  });

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId: orgId,
    action: 'DESTRUCTION_CERTIFICATE_ISSUED',
    resourceType: 'DestructionCertificate',
    resourceId: certificate.id,
    result: 'APPROVED',
    decision: 'APPROVED',
    decisionReason: `Data destroyed via ${destructionMethod} — ${destructionTrigger}`,
    description: `Destruction certificate ${certificateNumber} issued: ${dataCategory} (${destructionMethod})`,
    metadata: { certificateNumber, destructionMethod, destructionTrigger, recordCount },
    ipAddress: getClientIp(req),
    severity: 'warning',
  });

  return created(res, { certificate }, `Destruction certificate ${certificateNumber} issued`);
};

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/destruction/certificates
 */
const listCertificates = async (req, res) => {
  const orgId = req.user.organizationId;
  if (!orgId) {return forbidden(res, 'No organization associated');}

  const { destructionMethod, destructionTrigger } = req.query;

  const where = { organizationId: orgId };
  if (destructionMethod) {where.destructionMethod = destructionMethod;}
  if (destructionTrigger) {where.destructionTrigger = destructionTrigger;}

  const certificates = await DestructionCertificate.findAll({
    where,
    order: [['destructedAt', 'DESC']],
  });

  const summary = {
    total: certificates.length,
    byMethod: certificates.reduce((acc, c) => {
      acc[c.destructionMethod] = (acc[c.destructionMethod] || 0) + 1; return acc;
    }, {}),
    byTrigger: certificates.reduce((acc, c) => {
      acc[c.destructionTrigger] = (acc[c.destructionTrigger] || 0) + 1; return acc;
    }, {}),
    verified: certificates.filter((c) => c.verifiedAt).length,
    totalRecordsDestroyed: certificates.reduce((sum, c) => sum + (c.recordCount || 0), 0),
  };

  return success(res, { certificates, summary });
};

// ─── Get One ──────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/destruction/certificates/:id
 */
const getCertificate = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const certificate = await DestructionCertificate.findOne({
    where: { id, organizationId: orgId },
  });
  if (!certificate) {return notFound(res, 'Certificate not found');}

  // On-the-fly hash integrity check
  const hashPayload = {
    certificateNumber: certificate.certificateNumber,
    organizationId: certificate.organizationId,
    dataCategory: certificate.dataCategory,
    dataDescription: certificate.dataDescription,
    destructionMethod: certificate.destructionMethod,
    destructionScope: certificate.destructionScope,
    destructedAt: certificate.destructedAt.toISOString(),
    destructionTrigger: certificate.destructionTrigger,
    createdBy: certificate.createdBy,
  };
  const computedHash = buildVerificationHash(hashPayload);
  const integrityOk = computedHash === certificate.verificationHash;

  return success(res, { certificate, integrity: { ok: integrityOk, computedHash, storedHash: certificate.verificationHash } });
};

// ─── Verify ───────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/destruction/certificates/:id/verify
 * Admin marks the certificate as verified after confirming destruction.
 */
const verifyCertificate = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const certificate = await DestructionCertificate.findOne({
    where: { id, organizationId: orgId },
  });
  if (!certificate) {return notFound(res, 'Certificate not found');}

  if (certificate.verifiedAt) {
    return badRequest(res, 'Certificate has already been verified');
  }

  await certificate.update({
    verifiedBy: req.user.id,
    verifiedAt: new Date(),
  });

  await createAuditLog({
    actorId: req.user.id,
    actorRole: req.user.role,
    organizationId: orgId,
    action: 'DESTRUCTION_CERTIFICATE_VERIFIED',
    resourceType: 'DestructionCertificate',
    resourceId: id,
    result: 'APPROVED',
    decision: 'APPROVED',
    decisionReason: 'Admin confirmed data destruction',
    description: `Certificate ${certificate.certificateNumber} verified by admin`,
    metadata: { certificateNumber: certificate.certificateNumber },
    ipAddress: getClientIp(req),
    severity: 'info',
  });

  return success(res, { certificate }, `Certificate ${certificate.certificateNumber} verified`);
};

module.exports = { createCertificate, listCertificates, getCertificate, verifyCertificate };
