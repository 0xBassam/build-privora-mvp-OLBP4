const { AuditLog } = require('../models');
const logger = require('../utils/logger');

/**
 * Create an audit log entry.
 * Call this from controllers after significant actions.
 */
const createAuditLog = async ({
  actorId = null,
  actorRole = null,
  organizationId = null,
  action,
  resourceType = null,
  resourceId = null,
  description = null,
  metadata = {},
  ipAddress = null,
  userAgent = null,
  severity = 'info',
}) => {
  try {
    await AuditLog.create({
      actorId,
      actorRole,
      organizationId,
      action,
      resourceType,
      resourceId,
      description,
      metadata,
      ipAddress,
      userAgent,
      severity,
    });
  } catch (err) {
    // Audit logging must never crash the main request
    logger.error('Failed to create audit log', { error: err.message, action });
  }
};

/**
 * Extract client IP from request, accounting for proxies.
 */
const getClientIp = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.ip
  );
};

/**
 * Express middleware that logs every request (for API access log).
 */
const requestAuditMiddleware = (req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      logger.warn('API request error', {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        ip: getClientIp(req),
        userId: req.user?.id,
      });
    }
  });
  next();
};

module.exports = { createAuditLog, getClientIp, requestAuditMiddleware };
