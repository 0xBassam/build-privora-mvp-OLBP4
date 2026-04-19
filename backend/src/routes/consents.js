const express = require('express');
const { body, param } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const {
  listRequestsForUser,
  respondToConsent,
  getUserConsentHistory,
  createConsentRequest,
  listOrgConsentRequests,
  getConsentResponses,
  updateConsentRequest,
} = require('../controllers/consentController');

const router = express.Router();

router.use(authenticate);

// ─── User Portal Routes ───────────────────────────────────────────────────────

/**
 * @openapi
 * /consents/requests:
 *   get:
 *     tags: [Consents - User]
 *     summary: List pending consent requests for authenticated user
 *     security:
 *       - bearerAuth: []
 */
router.get('/requests', rbac(['user', 'org_admin', 'super_admin']), listRequestsForUser);

/**
 * @openapi
 * /consents/history:
 *   get:
 *     tags: [Consents - User]
 *     summary: Get user consent history
 *     security:
 *       - bearerAuth: []
 */
router.get('/history', rbac(['user', 'org_admin', 'super_admin']), getUserConsentHistory);

/**
 * @openapi
 * /consents/{id}/respond:
 *   post:
 *     tags: [Consents - User]
 *     summary: Respond to a consent request (approve/reject/withdraw)
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/:id/respond',
  rbac(['user', 'org_admin', 'super_admin']),
  [
    param('id').isUUID(),
    body('status').isIn(['approved', 'rejected', 'withdrawn']),
    body('reason').optional().trim().isLength({ max: 1000 }),
  ],
  validate,
  respondToConsent
);

// ─── Organization Dashboard Routes ───────────────────────────────────────────

/**
 * @openapi
 * /organizations/consents:
 *   post:
 *     tags: [Consents - Organization]
 *     summary: Create a consent request
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/org',
  rbac(['org_admin', 'super_admin']),
  [
    body('title').trim().isLength({ min: 5, max: 500 }),
    body('description').trim().isLength({ min: 10 }),
    body('dataTypes').isArray({ min: 1 }).withMessage('At least one data type required'),
    body('purpose').trim().isLength({ min: 10, max: 1000 }),
    body('legalBasis').optional().isIn([
      'consent', 'contract', 'legal_obligation',
      'vital_interests', 'public_task', 'legitimate_interests',
    ]),
    body('retentionPeriod').optional().trim().isLength({ max: 100 }),
    body('expiresAt').optional().isISO8601(),
  ],
  validate,
  createConsentRequest
);

/**
 * @openapi
 * /organizations/consents:
 *   get:
 *     tags: [Consents - Organization]
 *     summary: List organization consent requests
 *     security:
 *       - bearerAuth: []
 */
router.get('/org', rbac(['org_admin', 'super_admin']), listOrgConsentRequests);

/**
 * @openapi
 * /organizations/consents/{id}/responses:
 *   get:
 *     tags: [Consents - Organization]
 *     summary: Get responses for a consent request
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/org/:id/responses',
  rbac(['org_admin', 'super_admin']),
  [param('id').isUUID()],
  validate,
  getConsentResponses
);

/**
 * @openapi
 * /organizations/consents/{id}:
 *   patch:
 *     tags: [Consents - Organization]
 *     summary: Update or deactivate a consent request
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  '/org/:id',
  rbac(['org_admin', 'super_admin']),
  [param('id').isUUID()],
  validate,
  updateConsentRequest
);

module.exports = router;
