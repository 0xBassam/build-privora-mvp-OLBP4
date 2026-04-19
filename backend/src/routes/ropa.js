const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const {
  createRecord, listRecords, getRecord, updateRecord, deleteRecord, getStats,
} = require('../controllers/ropaController');

const router = express.Router();

const LEGAL_BASIS = ['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'];
const OWNER_ROLES = ['dpo', 'it_admin', 'org_admin', 'legal'];
const STATUSES = ['draft', 'active', 'under_review', 'archived'];

/**
 * POST /api/v1/ropa/records
 */
router.post(
  '/records',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    body('activityName').trim().notEmpty().withMessage('Activity name is required').isLength({ max: 500 }),
    body('activityDescription').trim().notEmpty().withMessage('Description is required'),
    body('processingPurpose').trim().notEmpty().withMessage('Processing purpose is required'),
    body('legalBasis').isIn(LEGAL_BASIS).withMessage('Invalid legal basis'),
    body('dataCategories').isArray().withMessage('dataCategories must be an array'),
    body('dataSubjectCategories').isArray().withMessage('dataSubjectCategories must be an array'),
    body('isSensitiveData').optional().isBoolean(),
    body('estimatedDataSubjects').optional().isInt({ min: 0 }),
    body('thirdPartyTransfers').optional().isBoolean(),
    body('crossBorderTransfers').optional().isBoolean(),
    body('dpiaRequired').optional().isBoolean(),
    body('ownerRole').optional().isIn(OWNER_ROLES),
  ],
  validate,
  createRecord
);

/**
 * GET /api/v1/ropa/records
 */
router.get(
  '/records',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    query('status').optional().isIn(STATUSES),
    query('legalBasis').optional().isIn(LEGAL_BASIS),
    query('isSensitiveData').optional().isBoolean(),
    query('dpiaRequired').optional().isBoolean(),
  ],
  validate,
  listRecords
);

/**
 * GET /api/v1/ropa/stats
 */
router.get('/stats', authenticate, rbac(['org_admin', 'super_admin']), getStats);

/**
 * GET /api/v1/ropa/records/:id
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
 * PATCH /api/v1/ropa/records/:id
 */
router.patch(
  '/records/:id',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    param('id').isUUID(),
    body('legalBasis').optional().isIn(LEGAL_BASIS),
    body('ownerRole').optional().isIn(OWNER_ROLES),
    body('status').optional().isIn(STATUSES),
    body('isSensitiveData').optional().isBoolean(),
    body('crossBorderTransfers').optional().isBoolean(),
    body('dpiaRequired').optional().isBoolean(),
    body('estimatedDataSubjects').optional().isInt({ min: 0 }),
  ],
  validate,
  updateRecord
);

/**
 * DELETE /api/v1/ropa/records/:id
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
