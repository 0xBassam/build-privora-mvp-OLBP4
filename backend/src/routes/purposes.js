const express = require('express');
const { body, param } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const {
  createPurpose, listPurposes, getPurpose, updatePurpose, deletePurpose, validateDataUsage,
} = require('../controllers/purposeController');

const router = express.Router();

/**
 * POST /api/v1/purposes/validate
 * Validate data usage against a registered purpose.
 */
router.post(
  '/validate',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    body('purposeId').isUUID().withMessage('Valid purposeId required'),
    body('dataTypes').isArray({ min: 1 }).withMessage('dataTypes must be a non-empty array'),
  ],
  validate,
  validateDataUsage
);

/**
 * POST /api/v1/purposes
 */
router.post(
  '/',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('legalBasis')
      .isIn(['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'])
      .withMessage('Invalid legal basis'),
    body('dataCategories').optional().isArray(),
    body('allowedDataTypes').optional().isArray(),
    body('retentionDays').optional().isInt({ min: 1 }),
    body('requiresExplicitConsent').optional().isBoolean(),
  ],
  validate,
  createPurpose
);

/**
 * GET /api/v1/purposes
 */
router.get('/', authenticate, rbac(['org_admin', 'super_admin']), listPurposes);

/**
 * GET /api/v1/purposes/:id
 */
router.get(
  '/:id',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [param('id').isUUID()],
  validate,
  getPurpose
);

/**
 * PATCH /api/v1/purposes/:id
 */
router.patch(
  '/:id',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    param('id').isUUID(),
    body('name').optional().trim().notEmpty(),
    body('legalBasis').optional().isIn(['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests']),
    body('dataCategories').optional().isArray(),
    body('allowedDataTypes').optional().isArray(),
    body('retentionDays').optional().isInt({ min: 1 }),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  updatePurpose
);

/**
 * DELETE /api/v1/purposes/:id
 */
router.delete(
  '/:id',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [param('id').isUUID()],
  validate,
  deletePurpose
);

module.exports = router;
