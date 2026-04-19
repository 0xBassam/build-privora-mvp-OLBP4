const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { RefreshToken } = require('../models');
const config = require('../config/config');

/**
 * Generate a signed JWT access token.
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId || null,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.accessExpires }
  );
};

/**
 * Generate a refresh token, persist its hash to the database.
 * Returns the plaintext token (sent to client, never stored as-is).
 */
const generateRefreshToken = async (userId, ipAddress, userAgent) => {
  const token = crypto.randomBytes(64).toString('hex');
  const tokenHash = await bcrypt.hash(token, 10);

  // Calculate expiry from config string (e.g. "7d")
  const daysMatch = config.jwt.refreshExpires.match(/^(\d+)d$/);
  const days = daysMatch ? parseInt(daysMatch[1], 10) : 7;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await RefreshToken.create({ userId, tokenHash, expiresAt, ipAddress, userAgent });
  return token;
};

/**
 * Validate a refresh token and return the associated userId.
 */
const validateRefreshToken = async (token) => {
  // Find all non-revoked, non-expired tokens for brute-force resistance
  const tokens = await RefreshToken.findAll({
    where: { isRevoked: false },
    order: [['createdAt', 'DESC']],
    limit: 20,
  });

  for (const record of tokens) {
    const matches = await bcrypt.compare(token, record.tokenHash);
    if (matches) {
      if (new Date() > record.expiresAt) {
        await record.update({ isRevoked: true });
        return null;
      }
      return record;
    }
  }
  return null;
};

/**
 * Revoke a specific refresh token record.
 */
const revokeRefreshToken = async (tokenRecord) => {
  await tokenRecord.update({ isRevoked: true });
};

/**
 * Revoke all refresh tokens for a user (logout all sessions).
 */
const revokeAllUserTokens = async (userId) => {
  await RefreshToken.update({ isRevoked: true }, { where: { userId } });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
};
