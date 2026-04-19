const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const {
  submitDsarRequest,
  verifyIdentity,
  listUserDsarRequests,
  listAdminDsarRequests,
  getAdminDsarRequest,
  processDsarRequest,
} = require('../controllers/dsarController');

const router = express.Router();

// ── User routes ───────────────────────────────────────────────────────────────

/**
 * POST /api/v1/dsar/requests
 */
router.post(
  '/requests',
  authenticate,
  rbac(['user', 'org_admin', 'super_admin']),
  [
    body('organizationId').isUUID().withMessage('Valid organizationId is required'),
    body('requestType')
      .isIn(['access', 'correction', 'deletion', 'portability', 'objection'])
      .withMessage('Invalid request type'),
    body('description').optional().isString().isLength({ max: 1000 }),
  ],
  validate,
  submitDsarRequest
);

/**
 * GET /api/v1/dsar/requests
 */
router.get(
  '/requests',
  authenticate,
  rbac(['user', 'org_admin', 'super_admin']),
  [
    query('status').optional().isIn(['pending', 'in_progress', 'completed', 'rejected']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  listUserDsarRequests
);

// ── Admin routes ──────────────────────────────────────────────────────────────

/**
 * GET /api/v1/dsar/admin/requests
 */
router.get(
  '/admin/requests',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    query('status').optional().isIn(['pending', 'in_progress', 'completed', 'rejected']),
    query('requestType').optional().isIn(['access', 'correction', 'deletion', 'portability', 'objection']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  listAdminDsarRequests
);

/**
 * GET /api/v1/dsar/admin/requests/:id
 */
router.get(
  '/admin/requests/:id',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [param('id').isUUID()],
  validate,
  getAdminDsarRequest
);

/**
 * POST /api/v1/dsar/admin/requests/:id/verify-identity
 * Record identity verification outcome (OTP, document, etc.).
 */
router.post(
  '/admin/requests/:id/verify-identity',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    param('id').isUUID(),
    body('identityVerificationMethod')
      .isIn(['otp', 'document', 'in_person', 'digital_signature'])
      .withMessage('Valid identityVerificationMethod is required'),
  ],
  validate,
  verifyIdentity
);

/**
 * PATCH /api/v1/dsar/admin/requests/:id
 */
router.patch(
  '/admin/requests/:id',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    param('id').isUUID(),
    body('status').optional().isIn(['pending', 'in_progress', 'completed', 'rejected']),
    body('adminNotes').optional().isString().isLength({ max: 2000 }),
    body('responseData').optional().isString().isLength({ max: 5000 }),
    body('rejectionReason').optional().isString().isLength({ max: 1000 }),
    body('disclosureType').optional().isIn(['full', 'partial', 'restricted']),
    body('restrictionReason').optional().isString().isLength({ max: 1000 }),
    body('restrictedFields').optional().isArray(),
  ],
  validate,
  processDsarRequest
);

module.exports = router;
