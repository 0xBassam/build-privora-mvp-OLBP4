const express = require('express');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { getOrgAnalytics, getAuditLogs } = require('../controllers/analyticsController');

const router = express.Router();

router.use(authenticate);

/**
 * @openapi
 * /analytics:
 *   get:
 *     tags: [Analytics]
 *     summary: Get organization analytics dashboard data
 *     security:
 *       - bearerAuth: []
 */
router.get('/', rbac(['org_admin', 'super_admin']), getOrgAnalytics);

/**
 * @openapi
 * /audit-logs:
 *   get:
 *     tags: [Analytics]
 *     summary: Get organization audit logs
 *     security:
 *       - bearerAuth: []
 */
router.get('/audit-logs', rbac(['org_admin', 'super_admin']), getAuditLogs);

module.exports = router;
