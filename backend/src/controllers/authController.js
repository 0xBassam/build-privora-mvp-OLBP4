const { User, Organization } = require('../models');
const { createOtp, verifyOtp } = require('../services/otpService');
const { sendOtpEmail } = require('../services/emailService');
const {
  generateAccessToken,
  generateRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
} = require('../services/tokenService');
const { createAuditLog, getClientIp } = require('../middleware/audit');
const { success, badRequest, unauthorized, error } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * POST /api/v1/auth/request-otp
 * Request an OTP for email-based login (User Portal).
 */
const requestOtp = async (req, res) => {
  const { email } = req.body;
  const ip = getClientIp(req);

  // Check if user exists; if not, auto-create (self-registration flow)
  let user = await User.findOne({ where: { email } });
  if (!user) {
    user = await User.create({ email, name: email.split('@')[0], role: 'user' });
    logger.info('New user auto-registered', { email });
  }

  if (!user.isActive) {
    return badRequest(res, 'Account is deactivated. Contact support.');
  }

  const otp = await createOtp(email, ip);

  try {
    await sendOtpEmail(email, otp, user.name);
  } catch (err) {
    logger.error('Failed to send OTP email', { email, error: err.message });
    // In production, don't expose email failure details
    return error(res, 'Failed to send OTP. Please try again later.', 503);
  }

  await createAuditLog({
    actorId: user.id,
    actorRole: user.role,
    action: 'OTP_REQUESTED',
    resourceType: 'User',
    resourceId: user.id,
    ipAddress: ip,
    userAgent: req.headers['user-agent'],
  });

  return success(res, {}, `OTP sent to ${email}. Valid for ${process.env.OTP_EXPIRES_MINUTES || 10} minutes.`);
};

/**
 * POST /api/v1/auth/verify-otp
 * Verify OTP and return JWT tokens.
 */
const verifyOtpHandler = async (req, res) => {
  const { email, otp } = req.body;
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'];

  const result = await verifyOtp(email, otp);
  if (!result.valid) {
    await createAuditLog({
      action: 'OTP_VERIFY_FAILED',
      description: result.reason,
      metadata: { email },
      ipAddress: ip,
      severity: 'warning',
    });
    return unauthorized(res, result.reason);
  }

  const user = await User.findOne({ where: { email } });
  if (!user || !user.isActive) {
    return unauthorized(res, 'Account not found or deactivated.');
  }

  await user.update({ lastLoginAt: new Date(), isEmailVerified: true });

  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user.id, ip, userAgent);

  await createAuditLog({
    actorId: user.id,
    actorRole: user.role,
    action: 'USER_LOGIN',
    resourceType: 'User',
    resourceId: user.id,
    ipAddress: ip,
    userAgent,
  });

  return success(res, {
    accessToken,
    refreshToken,
    user: user.toSafeJSON(),
  }, 'Login successful');
};

/**
 * POST /api/v1/auth/admin/login
 * Password-based login for org admins and super admins.
 */
const adminLogin = async (req, res) => {
  const { email, password } = req.body;
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'];

  const user = await User.findOne({ where: { email } });
  if (!user || !['org_admin', 'super_admin'].includes(user.role)) {
    return unauthorized(res, 'Invalid credentials');
  }

  if (!user.isActive) {
    return unauthorized(res, 'Account deactivated');
  }

  const valid = await user.verifyPassword(password);
  if (!valid) {
    await createAuditLog({
      actorId: user.id,
      action: 'ADMIN_LOGIN_FAILED',
      ipAddress: ip,
      severity: 'warning',
    });
    return unauthorized(res, 'Invalid credentials');
  }

  await user.update({ lastLoginAt: new Date() });

  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user.id, ip, userAgent);

  let organization = null;
  if (user.organizationId) {
    organization = await Organization.findByPk(user.organizationId);
  }

  await createAuditLog({
    actorId: user.id,
    actorRole: user.role,
    organizationId: user.organizationId,
    action: 'ADMIN_LOGIN',
    resourceType: 'User',
    resourceId: user.id,
    ipAddress: ip,
    userAgent,
  });

  return success(res, {
    accessToken,
    refreshToken,
    user: user.toSafeJSON(),
    organization,
  }, 'Admin login successful');
};

/**
 * POST /api/v1/auth/refresh
 * Exchange refresh token for new access token.
 */
const refreshToken = async (req, res) => {
  const { refreshToken: token } = req.body;
  if (!token) {return badRequest(res, 'Refresh token required');}

  const tokenRecord = await validateRefreshToken(token);
  if (!tokenRecord) {return unauthorized(res, 'Invalid or expired refresh token');}

  const user = await User.findByPk(tokenRecord.userId);
  if (!user || !user.isActive) {
    await revokeRefreshToken(tokenRecord);
    return unauthorized(res, 'User not found or deactivated');
  }

  const accessToken = generateAccessToken(user);
  return success(res, { accessToken }, 'Token refreshed');
};

/**
 * POST /api/v1/auth/logout
 * Revoke the provided refresh token.
 */
const logout = async (req, res) => {
  const { refreshToken: token } = req.body;
  if (token) {
    const tokenRecord = await validateRefreshToken(token);
    if (tokenRecord) {await revokeRefreshToken(tokenRecord);}
  }

  await createAuditLog({
    actorId: req.user?.id,
    actorRole: req.user?.role,
    action: 'USER_LOGOUT',
    ipAddress: getClientIp(req),
  });

  return success(res, {}, 'Logged out successfully');
};

module.exports = { requestOtp, verifyOtpHandler, adminLogin, refreshToken, logout };
