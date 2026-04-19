const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const {
  createCertificate, listCertificates, getCertificate, verifyCertificate,
} = require('../controllers/destructionController');

const router = express.Router();

/**
 * POST /api/v1/destruction/certificates
 * Issue a new destruction certificate (PDPL Art. 18).
 */
router.post(
  '/certificates',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    body('dataCategory').trim().notEmpty().withMessage('dataCategory is required'),
    body('dataDescription').trim().notEmpty().withMessage('dataDescription is required'),
    body('destructionMethod')
      .isIn(['deletion', 'anonymization', 'pseudonymization', 'physical_destruction', 'cryptographic_erasure'])
      .withMessage('Invalid destructionMethod'),
    body('destructionScope').trim().notEmpty().withMessage('destructionScope is required'),
    body('destructionTrigger')
      .isIn(['retention_expiry', 'user_request', 'dsar_deletion', 'manual', 'legal_requirement'])
      .withMessage('Invalid destructionTrigger'),
    body('recordCount').optional().isInt({ min: 0 }),
    body('destructedAt').optional().isISO8601(),
    body('legalBasisForDestruction').optional().isString().isLength({ max: 1000 }),
    body('retentionPolicyId').optional().isUUID(),
    body('ropaRecordId').optional().isUUID(),
    body('notes').optional().isString().isLength({ max: 2000 }),
  ],
  validate,
  createCertificate
);

/**
 * GET /api/v1/destruction/certificates
 */
router.get(
  '/certificates',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    query('destructionMethod').optional().isIn(['deletion', 'anonymization', 'pseudonymization', 'physical_destruction', 'cryptographic_erasure']),
    query('destructionTrigger').optional().isIn(['retention_expiry', 'user_request', 'dsar_deletion', 'manual', 'legal_requirement']),
  ],
  validate,
  listCertificates
);

/**
 * GET /api/v1/destruction/certificates/:id
 * Returns certificate with integrity check.
 */
router.get(
  '/certificates/:id',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [param('id').isUUID()],
  validate,
  getCertificate
);

/**
 * POST /api/v1/destruction/certificates/:id/verify
 * Admin confirms destruction and marks certificate as verified.
 */
router.post(
  '/certificates/:id/verify',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [param('id').isUUID()],
  validate,
  verifyCertificate
);

module.exports = router;
