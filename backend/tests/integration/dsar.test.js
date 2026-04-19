process.env.NODE_ENV = 'test';
process.env.ENCRYPTION_KEY = 'test_32_char_key_for_unit_tests!!';
process.env.JWT_SECRET = 'test_jwt_secret_for_unit_tests_ok';
process.env.JWT_ACCESS_EXPIRES = '15m';
process.env.JWT_REFRESH_EXPIRES = '7d';
process.env.FRONTEND_URL = 'http://localhost:3000';

const { setupTestDb, closeTestDb } = require('../helpers/testDb');
const { makeUser, makeAdmin, makeOrganization } = require('../helpers/factories');
const { v4: uuidv4 } = require('uuid');

jest.mock('../../src/services/emailService', () => ({
  sendOtpEmail: jest.fn().mockResolvedValue({ messageId: 'test-msg-id' }),
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'test-msg-id' }),
}));

let request;
let app;
let models;

const generateAccessToken = (user) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { userId: user.id, role: user.role, organizationId: user.organizationId || null },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

beforeAll(async () => {
  models = await setupTestDb();
  app = require('../../src/app');
  request = require('supertest');
});

afterAll(async () => {
  await closeTestDb();
});

const setup = async () => {
  const suffix = uuidv4().slice(0, 8);
  const org = await models.Organization.create(makeOrganization({ name: `OrgDSAR ${suffix}` }));
  const admin = await models.User.create(makeAdmin(org.id, { email: `dsar-admin-${suffix}@test.com` }));
  const user = await models.User.create(makeUser({ email: `dsar-user-${suffix}@test.com` }));

  return {
    org,
    admin,
    user,
    adminToken: generateAccessToken(admin),
    userToken: generateAccessToken(user),
  };
};

// ─── Submit DSAR ──────────────────────────────────────────────────────────────

describe('POST /api/v1/dsar/requests', () => {
  it('user can submit a DSAR to an organization', async () => {
    const { org, user, userToken } = await setup();

    const res = await request(app)
      .post('/api/v1/dsar/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ organizationId: org.id, requestType: 'access' });

    expect(res.status).toBe(201);
    expect(res.body.data.request.requestType).toBe('access');
    expect(res.body.data.request.status).toBe('pending');
    expect(res.body.data.request.slaDeadline).toBeDefined();
  });

  it('rejects submission to non-existent organization', async () => {
    const { userToken } = await setup();

    const res = await request(app)
      .post('/api/v1/dsar/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ organizationId: uuidv4(), requestType: 'deletion' });

    expect(res.status).toBe(404);
  });

  it('prevents duplicate open requests of same type', async () => {
    const { org, userToken } = await setup();

    await request(app)
      .post('/api/v1/dsar/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ organizationId: org.id, requestType: 'access' });

    const res = await request(app)
      .post('/api/v1/dsar/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ organizationId: org.id, requestType: 'access' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/open.*access/i);
  });

  it('allows different request types to the same org', async () => {
    const { org, userToken } = await setup();

    await request(app)
      .post('/api/v1/dsar/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ organizationId: org.id, requestType: 'access' });

    const res = await request(app)
      .post('/api/v1/dsar/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ organizationId: org.id, requestType: 'deletion' });

    expect(res.status).toBe(201);
  });

  it('rejects invalid requestType', async () => {
    const { org, userToken } = await setup();

    const res = await request(app)
      .post('/api/v1/dsar/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ organizationId: org.id, requestType: 'invalid_type' });

    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    const { org } = await setup();

    const res = await request(app)
      .post('/api/v1/dsar/requests')
      .send({ organizationId: org.id, requestType: 'access' });

    expect(res.status).toBe(401);
  });
});

// ─── List User DSARs ──────────────────────────────────────────────────────────

describe('GET /api/v1/dsar/requests', () => {
  it('user sees only their own requests', async () => {
    const { org, user, userToken } = await setup();
    const suffix = uuidv4().slice(0, 8);
    const org2 = await models.Organization.create(makeOrganization({ name: `OrgB ${suffix}` }));
    const user2 = await models.User.create(makeUser({ email: `other-${suffix}@test.com` }));
    const user2Token = generateAccessToken(user2);

    // user submits request
    await request(app)
      .post('/api/v1/dsar/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ organizationId: org.id, requestType: 'portability' });

    // user2 submits to same org
    await request(app)
      .post('/api/v1/dsar/requests')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ organizationId: org.id, requestType: 'portability' });

    const res = await request(app)
      .get('/api/v1/dsar/requests')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    const ids = res.body.data.requests.map((r) => r.userId);
    expect(ids.every((id) => id === user.id)).toBe(true);
  });

  it('supports status filter', async () => {
    const { org, userToken } = await setup();

    await request(app)
      .post('/api/v1/dsar/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ organizationId: org.id, requestType: 'correction' });

    const res = await request(app)
      .get('/api/v1/dsar/requests?status=pending')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.requests.every((r) => r.status === 'pending')).toBe(true);
  });
});

// ─── Admin: List DSARs ────────────────────────────────────────────────────────

describe('GET /api/v1/dsar/admin/requests', () => {
  it('admin can list DSARs for their org', async () => {
    const { org, admin, user, adminToken, userToken } = await setup();

    await request(app)
      .post('/api/v1/dsar/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ organizationId: org.id, requestType: 'objection' });

    const res = await request(app)
      .get('/api/v1/dsar/admin/requests')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.requests.length).toBeGreaterThan(0);
    expect(res.body.data.summary).toBeDefined();
  });

  it('non-admin cannot access admin route', async () => {
    const { userToken } = await setup();

    const res = await request(app)
      .get('/api/v1/dsar/admin/requests')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it('supports request type filter', async () => {
    const { org, adminToken, userToken } = await setup();

    await request(app)
      .post('/api/v1/dsar/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ organizationId: org.id, requestType: 'access' });

    const res = await request(app)
      .get('/api/v1/dsar/admin/requests?requestType=access')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.requests.every((r) => r.requestType === 'access')).toBe(true);
  });
});

// ─── Admin: Get DSAR by ID ────────────────────────────────────────────────────

describe('GET /api/v1/dsar/admin/requests/:id', () => {
  it('admin can get a single DSAR', async () => {
    const { org, adminToken, userToken } = await setup();

    const submitRes = await request(app)
      .post('/api/v1/dsar/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ organizationId: org.id, requestType: 'deletion' });

    const dsarId = submitRes.body.data.request.id;

    const res = await request(app)
      .get(`/api/v1/dsar/admin/requests/${dsarId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.request.id).toBe(dsarId);
  });

  it('returns 404 for request from another org', async () => {
    const { org, adminToken, userToken } = await setup();
    const suffix = uuidv4().slice(0, 8);
    const otherOrg = await models.Organization.create(makeOrganization({ name: `Other ${suffix}` }));
    const otherUser = await models.User.create(makeUser({ email: `other2-${suffix}@test.com` }));
    const otherUserToken = generateAccessToken(otherUser);

    const submitRes = await request(app)
      .post('/api/v1/dsar/requests')
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({ organizationId: otherOrg.id, requestType: 'access' });

    const otherDsarId = submitRes.body.data.request.id;

    const res = await request(app)
      .get(`/api/v1/dsar/admin/requests/${otherDsarId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

// ─── Admin: Process DSAR ──────────────────────────────────────────────────────

describe('PATCH /api/v1/dsar/admin/requests/:id', () => {
  it('admin can update status to in_progress', async () => {
    const { org, adminToken, userToken } = await setup();

    const submitRes = await request(app)
      .post('/api/v1/dsar/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ organizationId: org.id, requestType: 'access', description: 'Please send me my data' });

    const dsarId = submitRes.body.data.request.id;

    const res = await request(app)
      .patch(`/api/v1/dsar/admin/requests/${dsarId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'in_progress', adminNotes: 'Working on it' });

    expect(res.status).toBe(200);
    expect(res.body.data.request.status).toBe('in_progress');
    expect(res.body.data.request.adminNotes).toBe('Working on it');
  });

  it('admin can complete a DSAR', async () => {
    const { org, adminToken, userToken } = await setup();

    const submitRes = await request(app)
      .post('/api/v1/dsar/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ organizationId: org.id, requestType: 'portability' });

    const dsarId = submitRes.body.data.request.id;

    const res = await request(app)
      .patch(`/api/v1/dsar/admin/requests/${dsarId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'completed', responseData: 'Data export attached' });

    expect(res.status).toBe(200);
    expect(res.body.data.request.status).toBe('completed');
    expect(res.body.data.request.processedAt).toBeDefined();
  });

  it('prevents re-processing a closed DSAR', async () => {
    const { org, adminToken, userToken } = await setup();

    const submitRes = await request(app)
      .post('/api/v1/dsar/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ organizationId: org.id, requestType: 'objection' });

    const dsarId = submitRes.body.data.request.id;

    await request(app)
      .patch(`/api/v1/dsar/admin/requests/${dsarId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'rejected', rejectionReason: 'Not valid' });

    const res = await request(app)
      .patch(`/api/v1/dsar/admin/requests/${dsarId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'in_progress' });

    expect(res.status).toBe(400);
  });

  it('admin can reject a DSAR with reason', async () => {
    const { org, adminToken, userToken } = await setup();

    const submitRes = await request(app)
      .post('/api/v1/dsar/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ organizationId: org.id, requestType: 'correction' });

    const dsarId = submitRes.body.data.request.id;

    const res = await request(app)
      .patch(`/api/v1/dsar/admin/requests/${dsarId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'rejected', rejectionReason: 'Insufficient identity verification' });

    expect(res.status).toBe(200);
    expect(res.body.data.request.status).toBe('rejected');
    expect(res.body.data.request.rejectionReason).toBe('Insufficient identity verification');
  });
});
