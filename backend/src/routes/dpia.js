const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const {
  createAssessment, listAssessments, getAssessment,
  updateAssessment, submitDpoReview, deleteAssessment,
} = require('../controllers/dpiaController');

const router = express.Router();

const TRIGGER_REASONS = [
  'sensitive_data', 'large_scale_processing', 'systematic_monitoring',
  'new_technology', 'cross_border_transfer', 'vulnerable_subjects', 'manual_trigger',
];
const RISK_LEVELS = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['draft', 'in_review', 'approved', 'rejected', 'requires_update'];

/**
 * POST /api/v1/dpia/assessments
 */
router.post(
  '/assessments',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 500 }),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('triggerReason').isIn(TRIGGER_REASONS).withMessage('Invalid trigger reason'),
    body('ropaRecordId').optional().isUUID(),
    body('overallRiskLevel').optional().isIn(RISK_LEVELS),
    body('residualRiskLevel').optional().isIn(RISK_LEVELS),
    body('risksIdentified').optional().isArray(),
    body('mitigationMeasures').optional().isArray(),
    body('dpoConsultationRequired').optional().isBoolean(),
    body('reviewDate').optional().isISO8601(),
  ],
  validate,
  createAssessment
);

/**
 * GET /api/v1/dpia/assessments
 */
router.get(
  '/assessments',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    query('status').optional().isIn(STATUSES),
    query('overallRiskLevel').optional().isIn(RISK_LEVELS),
  ],
  validate,
  listAssessments
);

/**
 * GET /api/v1/dpia/assessments/:id
 */
router.get(
  '/assessments/:id',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [param('id').isUUID()],
  validate,
  getAssessment
);

/**
 * PATCH /api/v1/dpia/assessments/:id
 */
router.patch(
  '/assessments/:id',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    param('id').isUUID(),
    body('status').optional().isIn(STATUSES),
    body('overallRiskLevel').optional().isIn(RISK_LEVELS),
    body('residualRiskLevel').optional().isIn(RISK_LEVELS),
    body('risksIdentified').optional().isArray(),
    body('mitigationMeasures').optional().isArray(),
    body('dpoConsultationRequired').optional().isBoolean(),
    body('dpoConsultationDate').optional().isISO8601(),
    body('reviewDate').optional().isISO8601(),
  ],
  validate,
  updateAssessment
);

/**
 * POST /api/v1/dpia/assessments/:id/dpo-review
 */
router.post(
  '/assessments/:id/dpo-review',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [
    param('id').isUUID(),
    body('approved').isBoolean().withMessage('approved (boolean) is required'),
    body('recommendation').optional().isString().isLength({ max: 2000 }),
  ],
  validate,
  submitDpoReview
);

/**
 * DELETE /api/v1/dpia/assessments/:id
 */
router.delete(
  '/assessments/:id',
  authenticate,
  rbac(['org_admin', 'super_admin']),
  [param('id').isUUID()],
  validate,
  deleteAssessment
);

module.exports = router;
