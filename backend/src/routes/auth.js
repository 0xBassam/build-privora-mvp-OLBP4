const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const {
  requestOtp,
  verifyOtpHandler,
  adminLogin,
  refreshToken,
  logout,
} = require('../controllers/authController');
const config = require('../config/config');

const router = express.Router();

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.env === 'test' ? 10000 : config.rateLimit.otpMax,
  message: { success: false, message: 'Too many OTP requests. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @openapi
 * /auth/request-otp:
 *   post:
 *     tags: [Authentication]
 *     summary: Request login OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 */
router.post(
  '/request-otp',
  otpLimiter,
  [body('email').isEmail().normalizeEmail().withMessage('Valid email required')],
  validate,
  requestOtp
);

/**
 * @openapi
 * /auth/verify-otp:
 *   post:
 *     tags: [Authentication]
 *     summary: Verify OTP and receive JWT tokens
 */
router.post(
  '/verify-otp',
  otpLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').isLength({ min: 4, max: 8 }).withMessage('OTP must be 4-8 digits'),
  ],
  validate,
  verifyOtpHandler
);

/**
 * @openapi
 * /auth/admin/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Admin password login
 */
router.post(
  '/admin/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validate,
  adminLogin
);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh access token
 */
router.post(
  '/refresh',
  [body('refreshToken').notEmpty().withMessage('Refresh token required')],
  validate,
  refreshToken
);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout and revoke refresh token
 *     security:
 *       - bearerAuth: []
 */
router.post('/logout', authenticate, logout);

module.exports = router;
