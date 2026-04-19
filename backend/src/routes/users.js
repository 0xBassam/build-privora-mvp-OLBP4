const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { getMe, updateMe } = require('../controllers/userController');

const router = express.Router();

router.use(authenticate);

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get current user profile
 *     security:
 *       - bearerAuth: []
 */
router.get('/me', getMe);

/**
 * @openapi
 * /users/me:
 *   patch:
 *     tags: [Users]
 *     summary: Update current user profile
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  '/me',
  [
    body('name').optional().trim().isLength({ min: 2, max: 200 }),
    body('phone').optional().isMobilePhone(),
    body('preferredLanguage').optional().isIn(['en', 'ar']),
  ],
  validate,
  updateMe
);

module.exports = router;
