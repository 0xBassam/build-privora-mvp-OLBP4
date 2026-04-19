process.env.NODE_ENV = 'test';
process.env.ENCRYPTION_KEY = 'test_32_char_key_for_unit_tests!!';
process.env.JWT_SECRET = 'test_jwt_secret_for_unit_tests_ok';
process.env.JWT_ACCESS_EXPIRES = '15m';
process.env.JWT_REFRESH_EXPIRES = '7d';
process.env.FRONTEND_URL = 'http://localhost:3000';

const { setupTestDb, closeTestDb } = require('../helpers/testDb');
const { makeAdmin, makeOrganization } = require('../helpers/factories');
const { v4: uuidv4 } = require('uuid');

jest.mock('../../src/services/emailService', () => ({
  sendOtpEmail: jest.fn().mockResolvedValue({ messageId: 'test-msg-id' }),
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'test-msg-id' }),
}));

let request, app, models;

const generateToken = (user) => {
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

afterAll(async () => { await closeTestDb(); });

const setup = async () => {
  const suffix = uuidv4().slice(0, 8);
  const org = await models.Organization.create(makeOrganization({ name: `RetOrg ${suffix}` }));
  const admin = await models.User.create(makeAdmin(org.id, { email: `ret-admin-${suffix}@test.com` }));
  return { org, admin, adminToken: generateToken(admin) };
};

const basePolicy = {
  name: 'Health Data Retention',
  dataCategory: 'sensitive',
  retentionDays: 1825,
  warningDays: 60,
  action: 'delete',
};

// ─── Create Policy ────────────────────────────────────────────────────────────
describe('POST /api/v1/retention/policies', () => {
  it('creates a retention policy', async () => {
    const { adminToken } = await setup();
    const res = await request(app)
      .post('/api/v1/retention/policies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(basePolicy);
    expect(res.status).toBe(201);
    expect(res.body.data.policy.name).toBe('Health Data Retention');
    expect(res.body.data.policy.retentionDays).toBe(1825);
    expect(res.body.data.policy.action).toBe('delete');
  });

  it('defaults action to alert_only', async () => {
    const { adminToken } = await setup();
    const res = await request(app)
      .post('/api/v1/retention/policies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'PII Policy', dataCategory: 'pii', retentionDays: 365 });
    expect(res.status).toBe(201);
    expect(res.body.data.policy.action).toBe('alert_only');
  });

  it('rejects invalid dataCategory', async () => {
    const { adminToken } = await setup();
    const res = await request(app)
      .post('/api/v1/retention/policies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Bad', dataCategory: 'unknown', retentionDays: 365 });
    expect(res.status).toBe(400);
  });

  it('rejects missing retentionDays', async () => {
    const { adminToken } = await setup();
    const res = await request(app)
      .post('/api/v1/retention/policies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Bad', dataCategory: 'pii' });
    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await request(app).post('/api/v1/retention/policies').send(basePolicy);
    expect(res.status).toBe(401);
  });
});

// ─── List Policies ────────────────────────────────────────────────────────────
describe('GET /api/v1/retention/policies', () => {
  it('returns all policies for org', async () => {
    const { adminToken } = await setup();
    await request(app)
      .post('/api/v1/retention/policies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(basePolicy);
    await request(app)
      .post('/api/v1/retention/policies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Financial Data', dataCategory: 'financial', retentionDays: 2555, action: 'anonymize' });

    const res = await request(app)
      .get('/api/v1/retention/policies')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.policies.length).toBe(2);
    expect(res.body.data.summary.total).toBe(2);
    expect(res.body.data.summary.byCategory).toHaveProperty('sensitive');
    expect(res.body.data.summary.byCategory).toHaveProperty('financial');
  });

  it('org isolation — admin B cannot see admin A policies', async () => {
    const { adminToken: tokenA } = await setup();
    const { adminToken: tokenB } = await setup();
    await request(app)
      .post('/api/v1/retention/policies')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(basePolicy);
    const res = await request(app)
      .get('/api/v1/retention/policies')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(200);
    expect(res.body.data.policies.length).toBe(0);
  });
});

// ─── Update Policy ────────────────────────────────────────────────────────────
describe('PATCH /api/v1/retention/policies/:id', () => {
  it('updates action and retentionDays', async () => {
    const { adminToken } = await setup();
    const create = await request(app)
      .post('/api/v1/retention/policies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(basePolicy);
    const id = create.body.data.policy.id;

    const res = await request(app)
      .patch(`/api/v1/retention/policies/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'anonymize', retentionDays: 2190 });

    expect(res.status).toBe(200);
    expect(res.body.data.policy.action).toBe('anonymize');
    expect(res.body.data.policy.retentionDays).toBe(2190);
  });

  it('can deactivate a policy', async () => {
    const { adminToken } = await setup();
    const create = await request(app)
      .post('/api/v1/retention/policies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(basePolicy);
    const id = create.body.data.policy.id;

    const res = await request(app)
      .patch(`/api/v1/retention/policies/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.data.policy.isActive).toBe(false);
  });
});

// ─── Delete Policy ────────────────────────────────────────────────────────────
describe('DELETE /api/v1/retention/policies/:id', () => {
  it('deletes a policy', async () => {
    const { adminToken } = await setup();
    const create = await request(app)
      .post('/api/v1/retention/policies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(basePolicy);
    const id = create.body.data.policy.id;

    const res = await request(app)
      .delete(`/api/v1/retention/policies/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);

    const list = await request(app).get('/api/v1/retention/policies').set('Authorization', `Bearer ${adminToken}`);
    expect(list.body.data.policies.length).toBe(0);
  });

  it('returns 404 for policy from another org', async () => {
    const { adminToken: tokenA } = await setup();
    const { adminToken: tokenB } = await setup();
    const create = await request(app)
      .post('/api/v1/retention/policies')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(basePolicy);
    const id = create.body.data.policy.id;

    const res = await request(app)
      .delete(`/api/v1/retention/policies/${id}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
  });
});

// ─── Retention Status ─────────────────────────────────────────────────────────
describe('GET /api/v1/retention/status', () => {
  it('returns status with no policies', async () => {
    const { adminToken } = await setup();
    const res = await request(app)
      .get('/api/v1/retention/status')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.hasPolicies).toBe(false);
    expect(res.body.data.missingCategories).toContain('sensitive');
  });

  it('reflects active policies in status', async () => {
    const { adminToken } = await setup();
    await request(app)
      .post('/api/v1/retention/policies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(basePolicy);

    const res = await request(app)
      .get('/api/v1/retention/status')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.hasPolicies).toBe(true);
    expect(res.body.data.coverageCategories).toContain('sensitive');
  });
});

// ─── Run Retention Check ──────────────────────────────────────────────────────
describe('POST /api/v1/retention/run-check', () => {
  it('returns empty report when no policies', async () => {
    const { adminToken } = await setup();
    const res = await request(app)
      .post('/api/v1/retention/run-check')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ dryRun: true });
    expect(res.status).toBe(200);
    expect(res.body.data.summary.total).toBe(0);
  });

  it('runs dry-run check and returns report', async () => {
    const { adminToken } = await setup();
    await request(app)
      .post('/api/v1/retention/policies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Quick Expiry', dataCategory: 'general', retentionDays: 1, warningDays: 1, action: 'alert_only' });

    const res = await request(app)
      .post('/api/v1/retention/run-check')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ dryRun: true });
    expect(res.status).toBe(200);
    expect(res.body.data.dryRun).toBe(true);
    expect(res.body.data.summary).toHaveProperty('policiesChecked');
    expect(res.body.data.summary).toHaveProperty('transactionsScanned');
  });
});
