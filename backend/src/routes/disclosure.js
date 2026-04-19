const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const {
  createRecord, listRecords, getRecord, revokeRecord, validateArt16,
} = require('../controllers/disclosureController');

const router = express.Router();

/**
 * POST /api/v1/disclosure/records
 * Create a disclosure record (must exist before data sharing executes).
 */
router.post(
  '/records',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    body('disclosingEntity').trim().notEmpty().withMessage('disclosingEntity is required'),
    body('receivingEntity').trim().notEmpty().withMessage('receivingEntity is required'),
    body('receivingEntityType').optional().isIn(['organization', 'individual', 'government', 'third_party']),
    body('purpose').trim().notEmpty().withMessage('purpose is required'),
    body('purposeCategory').optional().isString(),
    body('dataCategories').optional().isArray(),
    body('dataFields').optional().isArray(),
    body('estimatedRecords').optional().isInt({ min: 0 }),
    body('legalBasis').trim().notEmpty().withMessage('legalBasis is required'),
    body('consentReference').optional().isString(),
    body('isCrossBorder').optional().isBoolean(),
    body('destinationCountry').optional().isString().isLength({ max: 100 }),
    body('transferSafeguards').optional().isString(),
    body('retentionPeriod').optional().isString(),
    body('expiresAt').optional().isISO8601(),
    body('dataSharingRequestId').optional().isUUID(),
  ],
  validate,
  createRecord
);

/**
 * GET /api/v1/disclosure/records
 * List all disclosure records for the organization.
 */
router.get(
  '/records',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    query('status').optional().isIn(['pending', 'active', 'executed', 'expired', 'revoked']),
    query('art16ClearanceResult').optional().isIn(['approved', 'blocked', 'not_evaluated']),
    query('isCrossBorder').optional().isBoolean(),
  ],
  validate,
  listRecords
);

/**
 * GET /api/v1/disclosure/records/:id
 */
router.get(
  '/records/:id',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [param('id').isUUID()],
  validate,
  getRecord
);

/**
 * POST /api/v1/disclosure/records/:id/revoke
 * Revoke an active disclosure record.
 */
router.post(
  '/records/:id/revoke',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    param('id').isUUID(),
    body('reason').optional().isString().isLength({ max: 1000 }),
  ],
  validate,
  revokeRecord
);

/**
 * POST /api/v1/disclosure/validate-art16
 * Standalone Art. 16 validation — no record created.
 */
router.post(
  '/validate-art16',
  authenticate,
  rbac(['org_admin', 'super_admin', 'user']),
  [
    body('dataTypes').optional().isArray(),
    body('legalBasis').optional().isString(),
    body('purpose').optional().isString(),
    body('purposeCategory').optional().isString(),
    body('crossBorderTransfer').optional().isBoolean(),
    body('transferSafeguards').optional().isString(),
    body('destinationCountry').optional().isString(),
  ],
  validate,
  validateArt16
);

module.exports = router;
