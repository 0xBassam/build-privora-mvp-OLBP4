const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { User } = require('../models');
const { unauthorized } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Verify JWT access token and attach user to req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized(res, 'Access token required');
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return unauthorized(res, 'Access token expired');
      }
      return unauthorized(res, 'Invalid access token');
    }

    const user = await User.findByPk(decoded.userId);
    if (!user || !user.isActive) {
      return unauthorized(res, 'User not found or deactivated');
    }

    req.user = user;
    next();
  } catch (err) {
    logger.error('Authentication middleware error', { error: err.message });
    return unauthorized(res, 'Authentication failed');
  }
};

/**
 * Optional authentication — attaches user if token present, continues either way.
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  return authenticate(req, res, next);
};

module.exports = { authenticate, optionalAuth };
