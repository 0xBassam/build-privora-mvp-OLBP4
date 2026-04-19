const { forbidden } = require('../utils/response');

/**
 * Role-Based Access Control middleware factory.
 * Usage: rbac(['org_admin', 'super_admin'])
 */
const rbac = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return forbidden(res, 'Authentication required');
    }
    if (!allowedRoles.includes(req.user.role)) {
      return forbidden(res, 'Insufficient permissions');
    }
    next();
  };
};

/**
 * Ensure the authenticated org_admin belongs to the organization they're acting on.
 * For super_admin, bypass organization check.
 */
const requireSameOrg = (getOrgId) => {
  return (req, res, next) => {
    if (!req.user) {return forbidden(res);}
    if (req.user.role === 'super_admin') {return next();}

    const orgId = typeof getOrgId === 'function' ? getOrgId(req) : req.params.organizationId;
    if (req.user.organizationId !== orgId) {
      return forbidden(res, 'Access denied: organization mismatch');
    }
    next();
  };
};

module.exports = { rbac, requireSameOrg };
