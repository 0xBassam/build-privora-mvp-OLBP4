const { rbac, requireSameOrg } = require('../../src/middleware/rbac');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('RBAC Middleware', () => {
  describe('rbac()', () => {
    it('calls next() when user has an allowed role', () => {
      const req = { user: { role: 'org_admin' } };
      const res = mockRes();
      const next = jest.fn();

      rbac(['org_admin', 'super_admin'])(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('returns 403 when role is not in allowed list', () => {
      const req = { user: { role: 'user' } };
      const res = mockRes();
      const next = jest.fn();

      rbac(['org_admin'])(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 403 when req.user is missing', () => {
      const req = {};
      const res = mockRes();
      const next = jest.fn();

      rbac(['user'])(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('allows super_admin for any role list', () => {
      const req = { user: { role: 'super_admin' } };
      const res = mockRes();
      const next = jest.fn();

      rbac(['super_admin'])(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('requireSameOrg()', () => {
    it('calls next() when org IDs match', () => {
      const orgId = 'org-uuid-123';
      const req = { user: { role: 'org_admin', organizationId: orgId }, params: { organizationId: orgId } };
      const res = mockRes();
      const next = jest.fn();

      requireSameOrg()(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('returns 403 when org IDs do not match', () => {
      const req = {
        user: { role: 'org_admin', organizationId: 'org-A' },
        params: { organizationId: 'org-B' },
      };
      const res = mockRes();
      const next = jest.fn();

      requireSameOrg()(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('bypasses org check for super_admin', () => {
      const req = {
        user: { role: 'super_admin', organizationId: 'org-A' },
        params: { organizationId: 'org-B' },
      };
      const res = mockRes();
      const next = jest.fn();

      requireSameOrg()(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
