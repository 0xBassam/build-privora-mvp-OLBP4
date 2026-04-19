const express = require('express');
const { body, param } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const {
  createPolicy, listPolicies, updatePolicy, deletePolicy,
  runRetentionCheck, getRetentionStatus,
} = require('../controllers/retentionController');

const router = express.Router();

/**
 * POST /api/v1/retention/policies
 */
router.post(
  '/policies',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('dataCategory')
      .isIn(['pii', 'sensitive', 'financial', 'biometric', 'behavioral', 'location', 'general'])
      .withMessage('Invalid data category'),
    body('retentionDays').isInt({ min: 1, max: 36500 }).withMessage('retentionDays must be 1–36500'),
    body('warningDays').optional().isInt({ min: 1, max: 365 }),
    body('action').optional().isIn(['delete', 'anonymize', 'alert_only']),
    body('purpose').optional().isString().isLength({ max: 200 }),
  ],
  validate,
  createPolicy
);

/**
 * GET /api/v1/retention/policies
 */
router.get('/policies', authenticate, rbac(['org_admin', 'super_admin']), listPolicies);

/**
 * PATCH /api/v1/retention/policies/:id
 */
router.patch(
  '/policies/:id',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    param('id').isUUID(),
    body('retentionDays').optional().isInt({ min: 1, max: 36500 }),
    body('warningDays').optional().isInt({ min: 1, max: 365 }),
    body('action').optional().isIn(['delete', 'anonymize', 'alert_only']),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  updatePolicy
);

/**
 * DELETE /api/v1/retention/policies/:id
 */
router.delete(
  '/policies/:id',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [param('id').isUUID()],
  validate,
  deletePolicy
);

/**
 * POST /api/v1/retention/run-check
 */
router.post(
  '/run-check',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [body('dryRun').optional().isBoolean()],
  validate,
  runRetentionCheck
);

/**
 * GET /api/v1/retention/status
 */
router.get('/status', authenticate, rbac(['org_admin', 'super_admin']), getRetentionStatus);

module.exports = router;
