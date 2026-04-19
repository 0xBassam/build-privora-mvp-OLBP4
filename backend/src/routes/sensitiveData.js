const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const {
  createRecord, listRecords, getRecord, updateRecord, deleteRecord, getRiskOverview,
} = require('../controllers/sensitiveDataController');

const router = express.Router();

const DATA_TYPES = [
  'health', 'biometric', 'genetic', 'racial_ethnic', 'religious',
  'political', 'criminal_records', 'financial', 'minor_data', 'other_sensitive',
];
const LEGAL_BASES = [
  'explicit_consent', 'vital_interests', 'legal_obligation',
  'public_interest', 'legal_claims', 'medical_treatment',
];
const STATUSES = ['active', 'suspended', 'discontinued'];
const DPIA_STATUSES = ['not_started', 'in_progress', 'completed', 'not_required'];

/**
 * POST /api/v1/sensitive-data/records
 */
router.post(
  '/records',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    body('dataType').isIn(DATA_TYPES).withMessage('Invalid data type'),
    body('dataTypeDescription').trim().notEmpty().withMessage('Data type description is required'),
    body('processingPurpose').trim().notEmpty().withMessage('Processing purpose is required'),
    body('legalBasis').isIn(LEGAL_BASES).withMessage('Invalid legal basis'),
    body('safeguards').trim().notEmpty().withMessage('Safeguards description is required'),
    body('consentRequestId').optional().isUUID(),
    body('encryptionApplied').optional().isBoolean(),
    body('pseudonymizationApplied').optional().isBoolean(),
    body('estimatedRecords').optional().isInt({ min: 0 }),
    body('reviewDate').optional().isISO8601(),
  ],
  validate,
  createRecord
);

/**
 * GET /api/v1/sensitive-data/records
 */
router.get(
  '/records',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    query('status').optional().isIn(STATUSES),
    query('dataType').optional().isIn(DATA_TYPES),
    query('legalBasis').optional().isIn(LEGAL_BASES),
    query('dpiaStatus').optional().isIn(DPIA_STATUSES),
  ],
  validate,
  listRecords
);

/**
 * GET /api/v1/sensitive-data/risk-overview
 */
router.get('/risk-overview', authenticate, rbac(['org_admin', 'super_admin']), getRiskOverview);

/**
 * GET /api/v1/sensitive-data/records/:id
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
 * PATCH /api/v1/sensitive-data/records/:id
 */
router.patch(
  '/records/:id',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    param('id').isUUID(),
    body('legalBasis').optional().isIn(LEGAL_BASES),
    body('status').optional().isIn(STATUSES),
    body('dpiaStatus').optional().isIn(DPIA_STATUSES),
    body('dpiaId').optional().isUUID(),
    body('consentRequestId').optional().isUUID(),
    body('encryptionApplied').optional().isBoolean(),
    body('pseudonymizationApplied').optional().isBoolean(),
    body('estimatedRecords').optional().isInt({ min: 0 }),
    body('reviewDate').optional().isISO8601(),
  ],
  validate,
  updateRecord
);

/**
 * DELETE /api/v1/sensitive-data/records/:id
 */
router.delete(
  '/records/:id',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [param('id').isUUID()],
  validate,
  deleteRecord
);

module.exports = router;
