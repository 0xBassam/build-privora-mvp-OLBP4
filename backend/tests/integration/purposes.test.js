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
  const org = await models.Organization.create(makeOrganization({ name: `PurpOrg ${suffix}` }));
  const admin = await models.User.create(makeAdmin(org.id, { email: `purp-admin-${suffix}@test.com` }));
  return { org, admin, adminToken: generateToken(admin) };
};

const basePurpose = {
  name: 'Medical Diagnosis',
  description: 'Processing health data to support clinical diagnosis and treatment planning.',
  legalBasis: 'legal_obligation',
  dataCategories: ['pii', 'sensitive'],
  allowedDataTypes: ['name', 'date_of_birth', 'health_data', 'contact_info'],
  retentionDays: 1825,
};

// ─── Create Purpose ───────────────────────────────────────────────────────────
describe('POST /api/v1/purposes', () => {
  it('creates a processing purpose', async () => {
    const { adminToken } = await setup();
    const res = await request(app)
      .post('/api/v1/purposes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(basePurpose);
    expect(res.status).toBe(201);
    expect(res.body.data.purpose.name).toBe('Medical Diagnosis');
    expect(res.body.data.purpose.legalBasis).toBe('legal_obligation');
    expect(res.body.data.purpose.requiresExplicitConsent).toBe(true);
  });

  it('forces requiresExplicitConsent=true for sensitive data categories', async () => {
    const { adminToken } = await setup();
    const res = await request(app)
      .post('/api/v1/purposes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...basePurpose, dataCategories: ['biometric'], requiresExplicitConsent: false });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/explicit consent/i);
  });

  it('allows requiresExplicitConsent=false for non-sensitive categories', async () => {
    const { adminToken } = await setup();
    const res = await request(app)
      .post('/api/v1/purposes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Delivery Tracking',
        description: 'Track deliveries for logistics.',
        legalBasis: 'contract',
        dataCategories: ['pii', 'location'],
        allowedDataTypes: ['name', 'address'],
        requiresExplicitConsent: false,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.purpose.requiresExplicitConsent).toBe(false);
  });

  it('rejects invalid legalBasis', async () => {
    const { adminToken } = await setup();
    const res = await request(app)
      .post('/api/v1/purposes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...basePurpose, legalBasis: 'made_up' });
    expect(res.status).toBe(400);
  });

  it('requires auth', async () => {
    const res = await request(app).post('/api/v1/purposes').send(basePurpose);
    expect(res.status).toBe(401);
  });
});

// ─── List Purposes ────────────────────────────────────────────────────────────
describe('GET /api/v1/purposes', () => {
  it('returns purposes with summary stats', async () => {
    const { adminToken } = await setup();
    await request(app).post('/api/v1/purposes').set('Authorization', `Bearer ${adminToken}`).send(basePurpose);
    await request(app).post('/api/v1/purposes').set('Authorization', `Bearer ${adminToken}`).send({
      name: 'Credit Scoring',
      description: 'Assess credit risk for loan products.',
      legalBasis: 'consent',
      dataCategories: ['pii', 'financial'],
      allowedDataTypes: ['name', 'national_id', 'financial_data'],
    });

    const res = await request(app).get('/api/v1/purposes').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.purposes.length).toBe(2);
    expect(res.body.data.summary.total).toBe(2);
    expect(res.body.data.summary.byLegalBasis).toHaveProperty('legal_obligation');
    expect(res.body.data.summary.byLegalBasis).toHaveProperty('consent');
  });

  it('org isolation', async () => {
    const { adminToken: tokenA } = await setup();
    const { adminToken: tokenB } = await setup();
    await request(app).post('/api/v1/purposes').set('Authorization', `Bearer ${tokenA}`).send(basePurpose);
    const res = await request(app).get('/api/v1/purposes').set('Authorization', `Bearer ${tokenB}`);
    expect(res.body.data.purposes.length).toBe(0);
  });
});

// ─── Get Purpose ──────────────────────────────────────────────────────────────
describe('GET /api/v1/purposes/:id', () => {
  it('returns purpose by id', async () => {
    const { adminToken } = await setup();
    const create = await request(app).post('/api/v1/purposes').set('Authorization', `Bearer ${adminToken}`).send(basePurpose);
    const id = create.body.data.purpose.id;
    const res = await request(app).get(`/api/v1/purposes/${id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.purpose.allowedDataTypes).toContain('health_data');
  });

  it('404 for another org', async () => {
    const { adminToken: tokenA } = await setup();
    const { adminToken: tokenB } = await setup();
    const create = await request(app).post('/api/v1/purposes').set('Authorization', `Bearer ${tokenA}`).send(basePurpose);
    const res = await request(app).get(`/api/v1/purposes/${create.body.data.purpose.id}`).set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(404);
  });
});

// ─── Update Purpose ───────────────────────────────────────────────────────────
describe('PATCH /api/v1/purposes/:id', () => {
  it('updates description and retentionDays', async () => {
    const { adminToken } = await setup();
    const create = await request(app).post('/api/v1/purposes').set('Authorization', `Bearer ${adminToken}`).send(basePurpose);
    const id = create.body.data.purpose.id;

    const res = await request(app)
      .patch(`/api/v1/purposes/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ retentionDays: 3650, isActive: false });
    expect(res.status).toBe(200);
    expect(res.body.data.purpose.retentionDays).toBe(3650);
    expect(res.body.data.purpose.isActive).toBe(false);
  });
});

// ─── Delete Purpose ───────────────────────────────────────────────────────────
describe('DELETE /api/v1/purposes/:id', () => {
  it('deletes a purpose', async () => {
    const { adminToken } = await setup();
    const create = await request(app).post('/api/v1/purposes').set('Authorization', `Bearer ${adminToken}`).send(basePurpose);
    const id = create.body.data.purpose.id;

    const del = await request(app).delete(`/api/v1/purposes/${id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);

    const list = await request(app).get('/api/v1/purposes').set('Authorization', `Bearer ${adminToken}`);
    expect(list.body.data.purposes.length).toBe(0);
  });
});

// ─── Validate Data Usage ──────────────────────────────────────────────────────
describe('POST /api/v1/purposes/validate', () => {
  it('validates approved data types as valid', async () => {
    const { adminToken } = await setup();
    const create = await request(app).post('/api/v1/purposes').set('Authorization', `Bearer ${adminToken}`).send(basePurpose);
    const purposeId = create.body.data.purpose.id;

    const res = await request(app)
      .post('/api/v1/purposes/validate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ purposeId, dataTypes: ['name', 'health_data'] });

    expect(res.status).toBe(200);
    expect(res.body.data.isValid).toBe(true);
    expect(res.body.data.unauthorizedDataTypes).toHaveLength(0);
  });

  it('flags unauthorized data types', async () => {
    const { adminToken } = await setup();
    const create = await request(app).post('/api/v1/purposes').set('Authorization', `Bearer ${adminToken}`).send(basePurpose);
    const purposeId = create.body.data.purpose.id;

    const res = await request(app)
      .post('/api/v1/purposes/validate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ purposeId, dataTypes: ['name', 'financial_data', 'location_data'] });

    expect(res.status).toBe(200);
    expect(res.body.data.isValid).toBe(false);
    expect(res.body.data.unauthorizedDataTypes).toContain('financial_data');
    expect(res.body.data.violation).toMatch(/PDPL Art\. 5/);
  });

  it('rejects inactive purpose', async () => {
    const { adminToken } = await setup();
    const create = await request(app).post('/api/v1/purposes').set('Authorization', `Bearer ${adminToken}`).send(basePurpose);
    const purposeId = create.body.data.purpose.id;
    await request(app).patch(`/api/v1/purposes/${purposeId}`).set('Authorization', `Bearer ${adminToken}`).send({ isActive: false });

    const res = await request(app)
      .post('/api/v1/purposes/validate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ purposeId, dataTypes: ['name'] });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/inactive/i);
  });
});
