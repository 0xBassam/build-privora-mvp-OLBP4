process.env.NODE_ENV = 'test';
process.env.ENCRYPTION_KEY = 'test_32_char_key_for_unit_tests!!';
process.env.JWT_SECRET = 'test_jwt_secret_for_unit_tests_ok';
process.env.JWT_ACCESS_EXPIRES = '15m';
process.env.JWT_REFRESH_EXPIRES = '7d';
process.env.OTP_EXPIRES_MINUTES = '10';
process.env.OTP_LENGTH = '6';
process.env.FRONTEND_URL = 'http://localhost:3000';

const { setupTestDb, closeTestDb } = require('../helpers/testDb');
const { makeUser, makeAdmin, makeOrganization, makeConsentRequest } = require('../helpers/factories');

jest.mock('../../src/services/emailService', () => ({
  sendOtpEmail: jest.fn().mockResolvedValue({}),
  sendEmail: jest.fn().mockResolvedValue({}),
}));

let request;
let app;
let models;

const getTokenForUser = async (user) => {
  const { generateAccessToken } = require('../../src/services/tokenService');
  return generateAccessToken(user);
};

beforeAll(async () => {
  models = await setupTestDb();
  app = require('../../src/app');
  request = require('supertest');
});

afterAll(async () => {
  await closeTestDb();
});

// ─── User: List Consent Requests ──────────────────────────────────────────────
describe('GET /api/v1/consents/requests', () => {
  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/v1/consents/requests');
    expect(res.status).toBe(401);
  });

  it('returns empty list when no active requests exist', async () => {
    const user = await models.User.create(makeUser());
    const token = await getTokenForUser(user);

    const res = await request(app)
      .get('/api/v1/consents/requests')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.requests).toBeInstanceOf(Array);
  });

  it('lists active consent requests for user', async () => {
    const org = await models.Organization.create(makeOrganization());
    const admin = await models.User.create(makeAdmin(org.id));
    const user = await models.User.create(makeUser());

    await models.ConsentRequest.create(makeConsentRequest(org.id, admin.id));

    const token = await getTokenForUser(user);
    const res = await request(app)
      .get('/api/v1/consents/requests')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.requests.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── User: Respond to Consent ─────────────────────────────────────────────────
describe('POST /api/v1/consents/:id/respond', () => {
  let org, admin, user, consentReq, userToken;

  beforeEach(async () => {
    org = await models.Organization.create(makeOrganization());
    admin = await models.User.create(makeAdmin(org.id));
    user = await models.User.create(makeUser());
    consentReq = await models.ConsentRequest.create(makeConsentRequest(org.id, admin.id));
    userToken = await getTokenForUser(user);
  });

  it('approves a consent request', async () => {
    const res = await request(app)
      .post(`/api/v1/consents/${consentReq.id}/respond`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'approved' });

    expect(res.status).toBe(200);
    expect(res.body.data.transaction.status).toBe('approved');
  });

  it('rejects a consent request with reason', async () => {
    const res = await request(app)
      .post(`/api/v1/consents/${consentReq.id}/respond`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'rejected', reason: 'Not comfortable sharing' });

    expect(res.status).toBe(200);
    expect(res.body.data.transaction.status).toBe('rejected');
    expect(res.body.data.transaction.reason).toBe('Not comfortable sharing');
  });

  it('returns 400 for duplicate response', async () => {
    await request(app)
      .post(`/api/v1/consents/${consentReq.id}/respond`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'approved' });

    const res = await request(app)
      .post(`/api/v1/consents/${consentReq.id}/respond`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'approved' });

    expect(res.status).toBe(400);
  });

  it('allows withdrawing a previously approved consent', async () => {
    await request(app)
      .post(`/api/v1/consents/${consentReq.id}/respond`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'approved' });

    const res = await request(app)
      .post(`/api/v1/consents/${consentReq.id}/respond`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'withdrawn', reason: 'Changed my mind' });

    expect(res.status).toBe(200);
    expect(res.body.data.transaction.status).toBe('withdrawn');
  });

  it('returns 400 for invalid status value', async () => {
    const res = await request(app)
      .post(`/api/v1/consents/${consentReq.id}/respond`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'maybe' });

    expect(res.status).toBe(400);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app)
      .post(`/api/v1/consents/${consentReq.id}/respond`)
      .send({ status: 'approved' });

    expect(res.status).toBe(401);
  });
});

// ─── User: Consent History ─────────────────────────────────────────────────────
describe('GET /api/v1/consents/history', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/consents/history');
    expect(res.status).toBe(401);
  });

  it('returns the user\'s consent transactions', async () => {
    const org = await models.Organization.create(makeOrganization());
    const admin = await models.User.create(makeAdmin(org.id));
    const user = await models.User.create(makeUser());
    const consentReq = await models.ConsentRequest.create(makeConsentRequest(org.id, admin.id));
    const token = await getTokenForUser(user);

    // Respond first
    await request(app)
      .post(`/api/v1/consents/${consentReq.id}/respond`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'approved' });

    const res = await request(app)
      .get('/api/v1/consents/history')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.history.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Org Admin: Create Consent Request ────────────────────────────────────────
describe('POST /api/v1/consents/org', () => {
  it('creates a consent request for org_admin', async () => {
    const org = await models.Organization.create(makeOrganization());
    const admin = await models.User.create(makeAdmin(org.id));
    const token = await getTokenForUser(admin);

    const res = await request(app)
      .post('/api/v1/consents/org')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Marketing Consent',
        description: 'We would like to send you marketing materials about our products',
        dataTypes: ['email', 'name'],
        purpose: 'Send marketing communications to opted-in users',
        legalBasis: 'consent',
        retentionPeriod: '2 years',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.consentRequest.title).toBe('Marketing Consent');
    expect(res.body.data.consentRequest.organizationId).toBe(org.id);
  });

  it('returns 403 for regular users', async () => {
    const user = await models.User.create(makeUser());
    const token = await getTokenForUser(user);

    const res = await request(app)
      .post('/api/v1/consents/org')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test', description: 'Test description here',
        dataTypes: ['email'], purpose: 'Testing purpose for consent management',
      });

    expect(res.status).toBe(403);
  });

  it('returns 400 when required fields are missing', async () => {
    const org = await models.Organization.create(makeOrganization());
    const admin = await models.User.create(makeAdmin(org.id));
    const token = await getTokenForUser(admin);

    const res = await request(app)
      .post('/api/v1/consents/org')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'No description or dataTypes' });

    expect(res.status).toBe(400);
  });
});

// ─── Org Admin: List Consent Requests ─────────────────────────────────────────
describe('GET /api/v1/consents/org', () => {
  it('lists consent requests for org_admin', async () => {
    const org = await models.Organization.create(makeOrganization());
    const admin = await models.User.create(makeAdmin(org.id));
    await models.ConsentRequest.create(makeConsentRequest(org.id, admin.id));
    const token = await getTokenForUser(admin);

    const res = await request(app)
      .get('/api/v1/consents/org')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.requests).toBeInstanceOf(Array);
    expect(res.body.data.requests.length).toBeGreaterThanOrEqual(1);
  });

  it('returns 403 for regular users', async () => {
    const user = await models.User.create(makeUser());
    const token = await getTokenForUser(user);

    const res = await request(app)
      .get('/api/v1/consents/org')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
