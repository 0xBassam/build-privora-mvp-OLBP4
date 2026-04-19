const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const {
  createNotice, listNotices, getNotice, getActiveNotice, updateNotice, activateNotice,
} = require('../controllers/privacyNoticeController');

const router = express.Router();

/**
 * GET /api/v1/privacy-notices/active
 * Public — get the active notice for an org (for users before consent).
 */
router.get(
  '/active',
  [query('organizationId').isUUID()],
  validate,
  getActiveNotice
);

/**
 * POST /api/v1/privacy-notices
 */
router.post(
  '/',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    body('title').trim().notEmpty(),
    body('version').trim().notEmpty().matches(/^\d+\.\d+$/).withMessage('Version must be in format X.Y (e.g. 1.0)'),
    body('purposeOfProcessing').trim().notEmpty().withMessage('Purpose of processing is required'),
    body('dataTypesCollected').optional().isArray(),
    body('retentionSummary').optional().isString().isLength({ max: 500 }),
    body('thirdPartySharing').optional().isBoolean(),
    body('thirdPartyDetails').optional().isString().isLength({ max: 2000 }),
    body('dataSubjectRights').optional().isArray(),
    body('contactEmail').optional().isEmail(),
    body('legalBasis').optional().isString(),
    body('effectiveDate').optional().isISO8601(),
    body('previousVersionId').optional().isUUID(),
    body('changeNotes').optional().isString().isLength({ max: 1000 }),
  ],
  validate,
  createNotice
);

/**
 * GET /api/v1/privacy-notices
 */
router.get('/', authenticate, rbac(['org_admin', 'super_admin']), listNotices);

/**
 * GET /api/v1/privacy-notices/:id
 */
router.get(
  '/:id',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [param('id').isUUID()],
  validate,
  getNotice
);

/**
 * PATCH /api/v1/privacy-notices/:id
 */
router.patch(
  '/:id',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    param('id').isUUID(),
    body('title').optional().trim().notEmpty(),
    body('purposeOfProcessing').optional().trim().notEmpty(),
    body('dataTypesCollected').optional().isArray(),
    body('thirdPartySharing').optional().isBoolean(),
    body('contactEmail').optional().isEmail(),
  ],
  validate,
  updateNotice
);

/**
 * POST /api/v1/privacy-notices/:id/activate
 */
router.post(
  '/:id/activate',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [param('id').isUUID()],
  validate,
  activateNotice
);

module.exports = router;
