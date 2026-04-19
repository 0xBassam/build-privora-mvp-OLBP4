const { Op, fn, col, literal } = require('sequelize');
const { ConsentRequest, ConsentTransaction, User } = require('../models');
const { sequelize } = require('../config/database');
const { success } = require('../utils/response');

/**
 * GET /api/v1/organizations/analytics
 * Returns dashboard analytics for the authenticated organization.
 */
const getOrgAnalytics = async (req, res) => {
  const organizationId = req.user.organizationId;

  // ── Total consent requests ──
  const totalRequests = await ConsentRequest.count({ where: { organizationId } });
  const activeRequests = await ConsentRequest.count({ where: { organizationId, isActive: true } });

  // ── Transaction totals ──
  const [statusBreakdown] = await sequelize.query(`
    SELECT
      ct.status,
      COUNT(*) AS count
    FROM consent_transactions ct
    WHERE ct."organizationId" = :organizationId
    GROUP BY ct.status
  `, { replacements: { organizationId }, type: sequelize.QueryTypes.SELECT, raw: true });

  // sequelize.query returns array of rows
  const allStatuses = await sequelize.query(`
    SELECT ct.status, COUNT(*) AS count
    FROM consent_transactions ct
    WHERE ct."organizationId" = :organizationId
    GROUP BY ct.status
  `, { replacements: { organizationId }, type: sequelize.QueryTypes.SELECT });

  const statusMap = { approved: 0, rejected: 0, withdrawn: 0, pending: 0 };
  allStatuses.forEach((row) => {
    statusMap[row.status] = parseInt(row.count, 10);
  });

  const totalResponses = Object.values(statusMap).reduce((a, b) => a + b, 0);
  const approvalRate = totalResponses > 0
    ? Math.round((statusMap.approved / totalResponses) * 100)
    : 0;

  // ── Unique users who responded ──
  const uniqueRespondents = await ConsentTransaction.count({
    where: { organizationId },
    distinct: true,
    col: 'userId',
  });

  // ── Responses over last 30 days (daily trend) ──
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const dailyTrend = await sequelize.query(`
    SELECT
      DATE("createdAt") AS date,
      status,
      COUNT(*) AS count
    FROM consent_transactions
    WHERE "organizationId" = :organizationId
      AND "createdAt" >= :since
    GROUP BY DATE("createdAt"), status
    ORDER BY DATE("createdAt")
  `, { replacements: { organizationId, since: thirtyDaysAgo }, type: sequelize.QueryTypes.SELECT });

  // ── Top consent requests by response volume ──
  const topRequests = await sequelize.query(`
    SELECT
      cr.id,
      cr.title,
      COUNT(ct.id) AS total_responses,
      SUM(CASE WHEN ct.status = 'approved' THEN 1 ELSE 0 END) AS approved,
      SUM(CASE WHEN ct.status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
      SUM(CASE WHEN ct.status = 'withdrawn' THEN 1 ELSE 0 END) AS withdrawn
    FROM consent_requests cr
    LEFT JOIN consent_transactions ct ON cr.id = ct."consentRequestId"
    WHERE cr."organizationId" = :organizationId
    GROUP BY cr.id, cr.title
    ORDER BY total_responses DESC
    LIMIT 5
  `, { replacements: { organizationId }, type: sequelize.QueryTypes.SELECT });

  return success(res, {
    summary: {
      totalRequests,
      activeRequests,
      totalResponses,
      uniqueRespondents,
      approvalRate,
    },
    statusBreakdown: statusMap,
    dailyTrend,
    topRequests,
  });
};

/**
 * GET /api/v1/audit-logs
 * Paginated audit log for the organization.
 */
const getAuditLogs = async (req, res) => {
  const { AuditLog } = require('../models');
  const organizationId = req.user.organizationId;
  const { page = 1, limit = 50, action, severity } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const where = { organizationId };
  if (action) {where.action = action;}
  if (severity) {where.severity = severity;}

  const { count, rows } = await AuditLog.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: Number(limit),
    offset,
  });

  return success(res, {
    logs: rows,
    pagination: { total: count, page: Number(page), limit: Number(limit), pages: Math.ceil(count / Number(limit)) },
  });
};

module.exports = { getOrgAnalytics, getAuditLogs };
