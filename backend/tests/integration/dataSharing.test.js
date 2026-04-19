process.env.NODE_ENV = 'test';
process.env.ENCRYPTION_KEY = 'test_32_char_key_for_unit_tests!!';
process.env.JWT_SECRET = 'test_jwt_secret_for_unit_tests_ok';
process.env.JWT_ACCESS_EXPIRES = '15m';
process.env.JWT_REFRESH_EXPIRES = '7d';
process.env.FRONTEND_URL = 'http://localhost:3000';

const { setupTestDb, closeTestDb } = require('../helpers/testDb');
const { makeUser, makeAdmin, makeOrganization } = require('../helpers/factories');

jest.mock('../../src/services/emailService', () => ({
  sendOtpEmail: jest.fn().mockResolvedValue({ messageId: 'test-msg-id' }),
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'test-msg-id' }),
}));

let request;
let app;
let models;

// Helper: generate access token directly for a user
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

// ─── Setup helpers ────────────────────────────────────────────────────────────

const { v4: uuidv4 } = require('uuid');

const setup = async () => {
  const suffix = uuidv4().slice(0, 8);
  const orgA = await models.Organization.create(makeOrganization({ name: `Entity X ${suffix}` }));
  const orgB = await models.Organization.create(makeOrganization({ name: `Entity Y ${suffix}` }));
  const adminA = await models.User.create(makeAdmin(orgA.id, { email: `adminx-${suffix}@test.com` }));
  const user = await models.User.create(makeUser({ email: `subject-${suffix}@test.com`, name: 'Ahmed Al-Saud' }));

  return {
    orgA, orgB,
    adminA,
    user,
    adminAToken: generateAccessToken(adminA),
    userToken: generateAccessToken(user),
  };
};

// ─── Create Data Sharing Request ──────────────────────────────────────────────
describe('POST /api/v1/data-sharing/requests', () => {
  it('org admin can create a data sharing request', async () => {
    const { adminAToken, user, orgB } = await setup();

    const res = await request(app)
      .post('/api/v1/data-sharing/requests')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        userId: user.id,
        providingOrgId: orgB.id,
        title: 'Identity Verification Request',
        dataTypes: ['name', 'national_id'],
        purpose: 'Verify customer identity for loan application',
        purposeCategory: 'identity_verification',
        duration: '30 days',
        legalBasis: 'consent',
        privacyNotice: 'Your data will only be used for identity verification purposes.',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.request.status).toBe('pending_consent');
    expect(res.body.data.request.dataTypes).toContain('name');
    expect(res.body.data.user.email).toBe(user.email);
  });

  it('skips to consent_approved if existing consent found', async () => {
    const { adminAToken, adminA, user, orgA } = await setup();

    // Create an existing approved consent transaction
    const consentReq = await models.ConsentRequest.create({
      organizationId: orgA.id,
      title: 'Pre-existing Consent',
      description: 'Previous consent',
      dataTypes: ['name'],
      purpose: 'Prior processing',
      legalBasis: 'consent',
      isActive: true,
      createdBy: adminA.id,
    });
    await models.ConsentTransaction.create({
      consentRequestId: consentReq.id,
      userId: user.id,
      organizationId: orgA.id,
      status: 'approved',
      respondedAt: new Date(),
    });

    const res = await request(app)
      .post('/api/v1/data-sharing/requests')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        userId: user.id,
        title: 'Auto-approved Request',
        dataTypes: ['name'],
        purpose: 'Same purpose as existing consent',
        duration: '7 days',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.request.status).toBe('consent_approved');
  });

  it('returns 400 when dataTypes is empty', async () => {
    const { adminAToken, user } = await setup();

    const res = await request(app)
      .post('/api/v1/data-sharing/requests')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        userId: user.id,
        title: 'Bad Request',
        dataTypes: [],
        purpose: 'Something',
        duration: '30 days',
      });

    expect(res.status).toBe(400);
  });

  it('returns 403 for regular users', async () => {
    const { userToken, user } = await setup();

    const res = await request(app)
      .post('/api/v1/data-sharing/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        userId: user.id,
        title: 'Unauthorized',
        dataTypes: ['email'],
        purpose: 'x',
        duration: '1 day',
      });

    expect(res.status).toBe(403);
  });
});

// ─── List Org Data Sharing Requests ──────────────────────────────────────────
describe('GET /api/v1/data-sharing/requests', () => {
  it('returns org requests with pagination', async () => {
    const { adminAToken, adminA, user, orgA } = await setup();

    await models.DataSharingRequest.create({
      requestingOrgId: orgA.id,
      userId: user.id,
      title: 'Test DSR',
      dataTypes: ['email'],
      purpose: 'Testing',
      duration: '7 days',
      status: 'pending_consent',
      createdBy: adminA.id,
    });

    const res = await request(app)
      .get('/api/v1/data-sharing/requests')
      .set('Authorization', `Bearer ${adminAToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.requests)).toBe(true);
    expect(res.body.data.requests.length).toBeGreaterThan(0);
    expect(res.body.data.pagination).toHaveProperty('total');
  });
});

// ─── User: View & Respond to Data Sharing Requests ───────────────────────────
describe('GET /api/v1/data-sharing/user/requests', () => {
  it('user can list their own data sharing requests', async () => {
    const { userToken, adminA, user, orgA } = await setup();

    await models.DataSharingRequest.create({
      requestingOrgId: orgA.id,
      userId: user.id,
      title: 'Health Data Request',
      dataTypes: ['name', 'email'],
      purpose: 'Healthcare service',
      duration: '1 year',
      status: 'pending_consent',
      createdBy: adminA.id,
    });

    const res = await request(app)
      .get('/api/v1/data-sharing/user/requests')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.requests)).toBe(true);
  });
});

describe('POST /api/v1/data-sharing/requests/:id/respond', () => {
  it('user can approve a data sharing request', async () => {
    const { userToken, adminA, user, orgA } = await setup();

    const dsr = await models.DataSharingRequest.create({
      requestingOrgId: orgA.id,
      userId: user.id,
      title: 'Financial Data Request',
      dataTypes: ['name'],
      purpose: 'Credit check',
      duration: '90 days',
      status: 'pending_consent',
      createdBy: adminA.id,
    });

    const res = await request(app)
      .post(`/api/v1/data-sharing/requests/${dsr.id}/respond`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'approved' });

    expect(res.status).toBe(200);
    expect(res.body.data.request.status).toBe('consent_approved');
    expect(res.body.data.request.respondedAt).not.toBeNull();
  });

  it('user can reject a data sharing request with reason', async () => {
    const { userToken, adminA, user, orgA } = await setup();

    const dsr = await models.DataSharingRequest.create({
      requestingOrgId: orgA.id,
      userId: user.id,
      title: 'Rejected Request',
      dataTypes: ['email'],
      purpose: 'Marketing',
      duration: '1 year',
      status: 'pending_consent',
      createdBy: adminA.id,
    });

    const res = await request(app)
      .post(`/api/v1/data-sharing/requests/${dsr.id}/respond`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'rejected', reason: 'Not comfortable sharing this data' });

    expect(res.status).toBe(200);
    expect(res.body.data.request.status).toBe('rejected');
    expect(res.body.data.request.rejectionReason).toBe('Not comfortable sharing this data');
  });

  it('returns 404 for already-responded request', async () => {
    const { userToken, adminA, user, orgA } = await setup();

    const dsr = await models.DataSharingRequest.create({
      requestingOrgId: orgA.id,
      userId: user.id,
      title: 'Already Approved',
      dataTypes: ['name'],
      purpose: 'Test',
      duration: '30 days',
      status: 'consent_approved',   // already responded
      createdBy: adminA.id,
    });

    const res = await request(app)
      .post(`/api/v1/data-sharing/requests/${dsr.id}/respond`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'approved' });

    expect(res.status).toBe(404);
  });
});

// ─── Execute Data Sharing ─────────────────────────────────────────────────────
describe('POST /api/v1/data-sharing/requests/:id/execute', () => {
  it('executes data sharing and returns minimized payload', async () => {
    const { adminAToken, adminA, user, orgA } = await setup();

    const dsr = await models.DataSharingRequest.create({
      requestingOrgId: orgA.id,
      userId: user.id,
      title: 'Execute Test',
      dataTypes: ['name', 'email'],
      purpose: 'Identity verification',
      duration: '7 days',
      status: 'consent_approved',
      createdBy: adminA.id,
    });

    const res = await request(app)
      .post(`/api/v1/data-sharing/requests/${dsr.id}/execute`)
      .set('Authorization', `Bearer ${adminAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('sharedData');
    expect(res.body.data).toHaveProperty('dataHash');
    expect(res.body.data.sharedData).toHaveProperty('name');
    expect(res.body.data.sharedData).toHaveProperty('email');
    // Should NOT include fields that weren't requested
    expect(res.body.data.sharedData).not.toHaveProperty('phone');
    expect(res.body.data).toHaveProperty('dataMinimizationNote');
  });

  it('returns 404 for pending_consent request (not yet approved)', async () => {
    const { adminAToken, adminA, user, orgA } = await setup();

    const dsr = await models.DataSharingRequest.create({
      requestingOrgId: orgA.id,
      userId: user.id,
      title: 'Not Approved',
      dataTypes: ['name'],
      purpose: 'Test',
      duration: '30 days',
      status: 'pending_consent',
      createdBy: adminA.id,
    });

    const res = await request(app)
      .post(`/api/v1/data-sharing/requests/${dsr.id}/execute`)
      .set('Authorization', `Bearer ${adminAToken}`);

    expect(res.status).toBe(404);
  });

  it('marks request as completed after execution', async () => {
    const { adminAToken, adminA, user, orgA } = await setup();

    const dsr = await models.DataSharingRequest.create({
      requestingOrgId: orgA.id,
      userId: user.id,
      title: 'Complete Test',
      dataTypes: ['email'],
      purpose: 'Verification',
      duration: '14 days',
      status: 'consent_approved',
      createdBy: adminA.id,
    });

    await request(app)
      .post(`/api/v1/data-sharing/requests/${dsr.id}/execute`)
      .set('Authorization', `Bearer ${adminAToken}`);

    const updated = await models.DataSharingRequest.findByPk(dsr.id);
    expect(updated.status).toBe('completed');
  });
});

// ─── Transactions Audit Trail ─────────────────────────────────────────────────
describe('GET /api/v1/data-sharing/transactions', () => {
  it('returns completed sharing transactions for the org', async () => {
    const { adminAToken, adminA, user, orgA } = await setup();

    // Create a completed DSR + transaction
    const dsr = await models.DataSharingRequest.create({
      requestingOrgId: orgA.id,
      userId: user.id,
      title: 'Completed DSR',
      dataTypes: ['name'],
      purpose: 'Audit test',
      duration: '30 days',
      status: 'completed',
      createdBy: adminA.id,
    });

    await models.DataSharingTransaction.create({
      dataSharingRequestId: dsr.id,
      requestingOrgId: orgA.id,
      userId: user.id,
      dataTypesShared: ['name'],
      purpose: 'Audit test',
      sharedAt: new Date(),
    });

    const res = await request(app)
      .get('/api/v1/data-sharing/transactions')
      .set('Authorization', `Bearer ${adminAToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.transactions)).toBe(true);
    expect(res.body.data.transactions.length).toBeGreaterThan(0);
  });
});
