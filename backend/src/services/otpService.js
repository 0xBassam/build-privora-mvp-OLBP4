const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const config = require('../config/config');
const { OtpCode } = require('../models');
const logger = require('../utils/logger');

const MAX_ATTEMPTS = 5;

/**
 * Generate a random numeric OTP of configured length.
 */
const generateOtp = () => {
  const length = config.otp.length;
  const max = Math.pow(10, length);
  const min = Math.pow(10, length - 1);
  return String(crypto.randomInt(min, max));
};

/**
 * Create and persist a new OTP for an email address.
 * Invalidates any existing unused OTPs for the same email.
 * Returns the plaintext OTP (to be sent via email, never stored).
 */
const createOtp = async (email, ipAddress = null) => {
  // Invalidate previous OTPs
  await OtpCode.update(
    { isUsed: true },
    { where: { email, isUsed: false } }
  );

  const plaintext = generateOtp();
  const codeHash = await bcrypt.hash(plaintext, 10);

  const expiresAt = new Date(Date.now() + config.otp.expiresMinutes * 60 * 1000);

  await OtpCode.create({ email, codeHash, expiresAt, ipAddress });

  logger.info('OTP created', { email, expiresAt });
  return plaintext;
};

/**
 * Verify an OTP for an email.
 * Returns { valid: true } or { valid: false, reason: '...' }
 */
const verifyOtp = async (email, code) => {
  const otpRecord = await OtpCode.findOne({
    where: { email, isUsed: false },
    order: [['createdAt', 'DESC']],
  });

  if (!otpRecord) {
    return { valid: false, reason: 'No active OTP found. Please request a new code.' };
  }

  if (new Date() > otpRecord.expiresAt) {
    await otpRecord.update({ isUsed: true });
    return { valid: false, reason: 'OTP has expired. Please request a new code.' };
  }

  if (otpRecord.attempts >= MAX_ATTEMPTS) {
    await otpRecord.update({ isUsed: true });
    return { valid: false, reason: 'Too many failed attempts. Please request a new code.' };
  }

  const matches = await bcrypt.compare(code, otpRecord.codeHash);
  if (!matches) {
    await otpRecord.increment('attempts');
    return { valid: false, reason: 'Invalid OTP code.' };
  }

  await otpRecord.update({ isUsed: true });
  return { valid: true };
};

module.exports = { createOtp, verifyOtp };
