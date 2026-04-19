const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const {
  createDataSharingRequest,
  listOrgDataSharingRequests,
  getDataSharingRequest,
  listUserDataSharingRequests,
  respondToDataSharingRequest,
  executeDataSharing,
  listTransactions,
} = require('../controllers/dataSharingController');

const router = express.Router();

// ── Org Admin routes ──────────────────────────────────────────────────────────

/**
 * POST /api/v1/data-sharing/requests
 * Create a data sharing request targeting a user.
 */
router.post(
  '/requests',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    body('userId').isUUID().withMessage('Valid userId is required'),
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('dataTypes').isArray({ min: 1 }).withMessage('At least one data type is required'),
    body('purpose').trim().notEmpty().withMessage('Purpose is required'),
    body('duration').trim().notEmpty().withMessage('Duration is required'),
    body('purposeCategory').optional().isString(),
    body('legalBasis').optional().isIn([
      'consent', 'contract', 'legal_obligation',
      'vital_interests', 'public_task', 'legitimate_interests',
    ]),
    body('expiresAt').optional().isISO8601(),
  ],
  validate,
  createDataSharingRequest
);

/**
 * GET /api/v1/data-sharing/requests
 * List this org's outgoing data sharing requests.
 */
router.get(
  '/requests',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    query('status').optional().isIn([
      'pending_consent', 'consent_approved', 'completed', 'rejected', 'expired', 'revoked',
    ]),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  listOrgDataSharingRequests
);

/**
 * GET /api/v1/data-sharing/requests/:id
 */
router.get(
  '/requests/:id',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [param('id').isUUID()],
  validate,
  getDataSharingRequest
);

/**
 * POST /api/v1/data-sharing/requests/:id/execute
 * Execute data sharing after user consent is approved.
 */
router.post(
  '/requests/:id/execute',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [param('id').isUUID()],
  validate,
  executeDataSharing
);

/**
 * GET /api/v1/data-sharing/transactions
 * Audit trail of completed data sharing transactions.
 */
router.get(
  '/transactions',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  listTransactions
);

// ── User routes ───────────────────────────────────────────────────────────────

/**
 * GET /api/v1/data-sharing/user/requests
 * List data sharing requests targeting the authenticated user.
 */
router.get(
  '/user/requests',
  authenticate,
  rbac(['user', 'org_admin', 'super_admin']),
  [
    query('status').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  listUserDataSharingRequests
);

/**
 * POST /api/v1/data-sharing/requests/:id/respond
 * User approves or rejects a data sharing request.
 */
router.post(
  '/requests/:id/respond',
  authenticate,
  rbac(['user', 'org_admin', 'super_admin']),
  [
    param('id').isUUID(),
    body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
    body('reason').optional().isString().isLength({ max: 500 }),
  ],
  validate,
  respondToDataSharingRequest
);

module.exports = router;
