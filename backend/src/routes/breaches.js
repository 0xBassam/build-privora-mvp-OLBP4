const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { createIncident, listIncidents, getIncident, updateIncident, submitHarmAssessment } = require('../controllers/breachController');

const router = express.Router();

/**
 * POST /api/v1/breaches
 */
router.post(
  '/',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('breachType')
      .isIn(['unauthorized_access', 'data_loss', 'ransomware', 'insider_threat', 'system_compromise', 'accidental_disclosure', 'other'])
      .withMessage('Invalid breach type'),
    body('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
    body('harmLevel').optional().isIn(['low', 'medium', 'high', 'critical']),
    body('affectedDataTypes').optional().isArray(),
    body('estimatedAffectedUsers').optional().isInt({ min: 0 }),
    body('discoveredAt').optional().isISO8601(),
    body('actionsTaken').optional().isString().isLength({ max: 5000 }),
    body('harmAssessment').optional().isObject(),
    body('rootCauseAnalysis').optional().isString().isLength({ max: 5000 }),
    body('rootCauseCategory').optional().isIn(['human_error', 'technical_failure', 'malicious_attack', 'third_party_failure', 'process_failure', 'unknown']),
    body('preventiveMeasures').optional().isString().isLength({ max: 5000 }),
  ],
  validate,
  createIncident
);

/**
 * GET /api/v1/breaches
 */
router.get(
  '/',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    query('status').optional().isIn(['open', 'investigating', 'contained', 'resolved']),
    query('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
    query('harmLevel').optional().isIn(['low', 'medium', 'high', 'critical']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  listIncidents
);

/**
 * GET /api/v1/breaches/:id
 */
router.get(
  '/:id',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [param('id').isUUID()],
  validate,
  getIncident
);

/**
 * PATCH /api/v1/breaches/:id
 */
router.patch(
  '/:id',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    param('id').isUUID(),
    body('status').optional().isIn(['open', 'investigating', 'contained', 'resolved']),
    body('notifiedAuthority').optional().isBoolean(),
    body('notifiedUsers').optional().isBoolean(),
    body('actionsTaken').optional().isString().isLength({ max: 5000 }),
    body('timelineNote').optional().isString().isLength({ max: 500 }),
    body('resolvedAt').optional().isISO8601(),
    body('harmLevel').optional().isIn(['low', 'medium', 'high', 'critical']),
    body('harmAssessment').optional().isObject(),
    body('rootCauseAnalysis').optional().isString().isLength({ max: 5000 }),
    body('rootCauseCategory').optional().isIn(['human_error', 'technical_failure', 'malicious_attack', 'third_party_failure', 'process_failure', 'unknown']),
    body('preventiveMeasures').optional().isString().isLength({ max: 5000 }),
  ],
  validate,
  updateIncident
);

/**
 * POST /api/v1/breaches/:id/harm-assessment
 * Submit structured harm assessment and auto-compute notification requirements.
 */
router.post(
  '/:id/harm-assessment',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    param('id').isUUID(),
    body('harmLevel').isIn(['low', 'medium', 'high', 'critical']).withMessage('harmLevel is required'),
    body('financialHarm').optional().isBoolean(),
    body('reputationalHarm').optional().isBoolean(),
    body('physicalHarm').optional().isBoolean(),
    body('identityTheftRisk').optional().isBoolean(),
    body('discriminationRisk').optional().isBoolean(),
    body('explanation').optional().isString().isLength({ max: 2000 }),
  ],
  validate,
  submitHarmAssessment
);

module.exports = router;
