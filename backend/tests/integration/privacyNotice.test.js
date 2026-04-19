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
  const org = await models.Organization.create(makeOrganization({ name: `PNOrg ${suffix}` }));
  const admin = await models.User.create(makeAdmin(org.id, { email: `pn-admin-${suffix}@test.com` }));
  return { org, admin, adminToken: generateToken(admin) };
};

const baseNotice = {
  title: 'Ministry of Health Privacy Notice',
  version: '1.0',
  purposeOfProcessing: 'To provide healthcare services and manage patient records in compliance with PDPL.',
  dataTypesCollected: ['name', 'date_of_birth', 'health_data', 'contact_info'],
  retentionSummary: '5 years from last appointment date',
  thirdPartySharing: false,
  contactEmail: 'privacy@moh.gov.sa',
  legalBasis: 'legal_obligation',
  effectiveDate: '2025-01-01',
};

// ─── Create Notice ────────────────────────────────────────────────────────────
describe('POST /api/v1/privacy-notices', () => {
  it('creates a privacy notice', async () => {
    const { adminToken } = await setup();
    const res = await request(app)
      .post('/api/v1/privacy-notices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(baseNotice);
    expect(res.status).toBe(201);
    expect(res.body.data.notice.version).toBe('1.0');
    expect(res.body.data.notice.isActive).toBe(true);
    expect(res.body.data.notice.thirdPartySharing).toBe(false);
  });

  it('sets default dataSubjectRights if not provided', async () => {
    const { adminToken } = await setup();
    const res = await request(app)
      .post('/api/v1/privacy-notices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(baseNotice);
    expect(res.body.data.notice.dataSubjectRights).toContain('access');
    expect(res.body.data.notice.dataSubjectRights).toContain('deletion');
  });

  it('rejects duplicate version for same org', async () => {
    const { adminToken } = await setup();
    await request(app)
      .post('/api/v1/privacy-notices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(baseNotice);
    const res = await request(app)
      .post('/api/v1/privacy-notices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(baseNotice);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/);
  });

  it('creating new notice deactivates previous active one', async () => {
    const { adminToken } = await setup();
    await request(app)
      .post('/api/v1/privacy-notices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(baseNotice);

    await request(app)
      .post('/api/v1/privacy-notices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...baseNotice, version: '2.0', changeNotes: 'Added third party details' });

    const list = await request(app)
      .get('/api/v1/privacy-notices')
      .set('Authorization', `Bearer ${adminToken}`);

    const notices = list.body.data.notices;
    const active = notices.filter((n) => n.isActive);
    expect(active.length).toBe(1);
    expect(active[0].version).toBe('2.0');
  });

  it('rejects invalid version format', async () => {
    const { adminToken } = await setup();
    const res = await request(app)
      .post('/api/v1/privacy-notices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...baseNotice, version: 'v1' });
    expect(res.status).toBe(400);
  });

  it('requires purposeOfProcessing', async () => {
    const { adminToken } = await setup();
    const { purposeOfProcessing, ...without } = baseNotice;
    const res = await request(app)
      .post('/api/v1/privacy-notices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(without);
    expect(res.status).toBe(400);
  });
});

// ─── List Notices ─────────────────────────────────────────────────────────────
describe('GET /api/v1/privacy-notices', () => {
  it('returns all versions with activeNotice identified', async () => {
    const { adminToken } = await setup();
    await request(app).post('/api/v1/privacy-notices').set('Authorization', `Bearer ${adminToken}`).send(baseNotice);
    await request(app).post('/api/v1/privacy-notices').set('Authorization', `Bearer ${adminToken}`).send({ ...baseNotice, version: '1.1' });

    const res = await request(app).get('/api/v1/privacy-notices').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.notices.length).toBe(2);
    expect(res.body.data.activeNotice).not.toBeNull();
    expect(res.body.data.activeNotice.version).toBe('1.1');
  });
});

// ─── Get Single Notice ────────────────────────────────────────────────────────
describe('GET /api/v1/privacy-notices/:id', () => {
  it('returns notice by id', async () => {
    const { adminToken } = await setup();
    const create = await request(app).post('/api/v1/privacy-notices').set('Authorization', `Bearer ${adminToken}`).send(baseNotice);
    const id = create.body.data.notice.id;

    const res = await request(app).get(`/api/v1/privacy-notices/${id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.notice.id).toBe(id);
  });

  it('404 for notice from another org', async () => {
    const { adminToken: tokenA } = await setup();
    const { adminToken: tokenB } = await setup();
    const create = await request(app).post('/api/v1/privacy-notices').set('Authorization', `Bearer ${tokenA}`).send(baseNotice);
    const id = create.body.data.notice.id;

    const res = await request(app).get(`/api/v1/privacy-notices/${id}`).set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(404);
  });
});

// ─── Update Notice ────────────────────────────────────────────────────────────
describe('PATCH /api/v1/privacy-notices/:id', () => {
  it('updates contactEmail and retentionSummary', async () => {
    const { adminToken } = await setup();
    const create = await request(app).post('/api/v1/privacy-notices').set('Authorization', `Bearer ${adminToken}`).send(baseNotice);
    const id = create.body.data.notice.id;

    const res = await request(app)
      .patch(`/api/v1/privacy-notices/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ contactEmail: 'dpo@moh.gov.sa', retentionSummary: '7 years' });

    expect(res.status).toBe(200);
    expect(res.body.data.notice.contactEmail).toBe('dpo@moh.gov.sa');
    expect(res.body.data.notice.retentionSummary).toBe('7 years');
  });
});

// ─── Activate Notice ──────────────────────────────────────────────────────────
describe('POST /api/v1/privacy-notices/:id/activate', () => {
  it('activates an older version', async () => {
    const { adminToken } = await setup();
    const v1 = await request(app).post('/api/v1/privacy-notices').set('Authorization', `Bearer ${adminToken}`).send(baseNotice);
    await request(app).post('/api/v1/privacy-notices').set('Authorization', `Bearer ${adminToken}`).send({ ...baseNotice, version: '2.0' });

    const v1Id = v1.body.data.notice.id;
    const res = await request(app)
      .post(`/api/v1/privacy-notices/${v1Id}/activate`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);

    const list = await request(app).get('/api/v1/privacy-notices').set('Authorization', `Bearer ${adminToken}`);
    expect(list.body.data.activeNotice.version).toBe('1.0');
  });
});

// ─── Public Active Notice ─────────────────────────────────────────────────────
describe('GET /api/v1/privacy-notices/active', () => {
  it('returns active notice without auth', async () => {
    const { org, adminToken } = await setup();
    await request(app).post('/api/v1/privacy-notices').set('Authorization', `Bearer ${adminToken}`).send(baseNotice);

    const res = await request(app).get(`/api/v1/privacy-notices/active?organizationId=${org.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.notice.version).toBe('1.0');
  });

  it('404 when no active notice exists', async () => {
    const res = await request(app).get(`/api/v1/privacy-notices/active?organizationId=${uuidv4()}`);
    expect(res.status).toBe(404);
  });
});
