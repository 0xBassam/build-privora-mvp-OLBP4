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
  const org = await models.Organization.create(makeOrganization({ name: `OrgBreach ${suffix}` }));
  const admin = await models.User.create(makeAdmin(org.id, { email: `breach-admin-${suffix}@test.com` }));

  return {
    org,
    admin,
    adminToken: generateAccessToken(admin),
  };
};

const baseIncident = {
  title: 'Customer DB Exposure',
  description: 'Unauthorized access to customer database detected.',
  breachType: 'unauthorized_access',
  severity: 'high',
  affectedDataTypes: ['names', 'emails'],
  estimatedAffectedUsers: 500,
};

// ─── Create Incident ──────────────────────────────────────────────────────────

describe('POST /api/v1/breaches', () => {
  it('org admin can create a breach incident', async () => {
    const { adminToken } = await setup();

    const res = await request(app)
      .post('/api/v1/breaches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(baseIncident);

    expect(res.status).toBe(201);
    expect(res.body.data.incident.title).toBe('Customer DB Exposure');
    expect(res.body.data.incident.status).toBe('open');
    expect(res.body.data.incident.severity).toBe('high');
    expect(res.body.data.incident.timeline).toHaveLength(1);
    expect(res.body.message).toMatch(/PDPL/);
  });

  it('defaults severity to medium when not provided', async () => {
    const { adminToken } = await setup();

    const res = await request(app)
      .post('/api/v1/breaches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Test', description: 'Test desc', breachType: 'data_loss' });

    expect(res.status).toBe(201);
    expect(res.body.data.incident.severity).toBe('medium');
  });

  it('rejects invalid breachType', async () => {
    const { adminToken } = await setup();

    const res = await request(app)
      .post('/api/v1/breaches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...baseIncident, breachType: 'not_valid' });

    expect(res.status).toBe(400);
  });

  it('requires title and description', async () => {
    const { adminToken } = await setup();

    const res = await request(app)
      .post('/api/v1/breaches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ breachType: 'ransomware' });

    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await request(app)
      .post('/api/v1/breaches')
      .send(baseIncident);

    expect(res.status).toBe(401);
  });
});

// ─── List Incidents ───────────────────────────────────────────────────────────

describe('GET /api/v1/breaches', () => {
  it('admin can list incidents for their org', async () => {
    const { adminToken } = await setup();

    await request(app)
      .post('/api/v1/breaches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(baseIncident);

    const res = await request(app)
      .get('/api/v1/breaches')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.incidents.length).toBeGreaterThan(0);
    expect(res.body.data.summary).toBeDefined();
    expect(res.body.data.summary).toHaveProperty('total');
    expect(res.body.data.summary).toHaveProperty('open');
    expect(res.body.data.summary).toHaveProperty('unnotified');
  });

  it('filters by status', async () => {
    const { adminToken } = await setup();

    await request(app)
      .post('/api/v1/breaches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(baseIncident);

    const res = await request(app)
      .get('/api/v1/breaches?status=open')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.incidents.every((i) => i.status === 'open')).toBe(true);
  });

  it('filters by severity', async () => {
    const { adminToken } = await setup();

    await request(app)
      .post('/api/v1/breaches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...baseIncident, severity: 'critical' });

    const res = await request(app)
      .get('/api/v1/breaches?severity=critical')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.incidents.every((i) => i.severity === 'critical')).toBe(true);
  });

  it('admin only sees their org incidents', async () => {
    const { adminToken: adminA } = await setup();
    const { adminToken: adminB } = await setup();

    await request(app)
      .post('/api/v1/breaches')
      .set('Authorization', `Bearer ${adminA}`)
      .send(baseIncident);

    const res = await request(app)
      .get('/api/v1/breaches')
      .set('Authorization', `Bearer ${adminB}`);

    expect(res.status).toBe(200);
    // adminB's org should have no incidents
    expect(res.body.data.incidents.length).toBe(0);
  });
});

// ─── Get Incident ─────────────────────────────────────────────────────────────

describe('GET /api/v1/breaches/:id', () => {
  it('admin can fetch a single incident', async () => {
    const { adminToken } = await setup();

    const createRes = await request(app)
      .post('/api/v1/breaches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(baseIncident);

    const incidentId = createRes.body.data.incident.id;

    const res = await request(app)
      .get(`/api/v1/breaches/${incidentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.incident.id).toBe(incidentId);
  });

  it('returns 404 for incident from another org', async () => {
    const { adminToken: adminA } = await setup();
    const { adminToken: adminB } = await setup();

    const createRes = await request(app)
      .post('/api/v1/breaches')
      .set('Authorization', `Bearer ${adminA}`)
      .send(baseIncident);

    const incidentId = createRes.body.data.incident.id;

    const res = await request(app)
      .get(`/api/v1/breaches/${incidentId}`)
      .set('Authorization', `Bearer ${adminB}`);

    expect(res.status).toBe(404);
  });
});

// ─── Update Incident ──────────────────────────────────────────────────────────

describe('PATCH /api/v1/breaches/:id', () => {
  it('admin can update status to investigating', async () => {
    const { adminToken } = await setup();

    const createRes = await request(app)
      .post('/api/v1/breaches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(baseIncident);

    const incidentId = createRes.body.data.incident.id;

    const res = await request(app)
      .patch(`/api/v1/breaches/${incidentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'investigating', timelineNote: 'Started forensic analysis' });

    expect(res.status).toBe(200);
    expect(res.body.data.incident.status).toBe('investigating');
  });

  it('marks notifiedAuthorityAt when first notifying authority', async () => {
    const { adminToken } = await setup();

    const createRes = await request(app)
      .post('/api/v1/breaches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(baseIncident);

    const incidentId = createRes.body.data.incident.id;

    const res = await request(app)
      .patch(`/api/v1/breaches/${incidentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notifiedAuthority: true });

    expect(res.status).toBe(200);
    expect(res.body.data.incident.notifiedAuthority).toBe(true);
    expect(res.body.data.incident.notifiedAuthorityAt).toBeDefined();
  });

  it('marks notifiedUsersAt when first notifying users', async () => {
    const { adminToken } = await setup();

    const createRes = await request(app)
      .post('/api/v1/breaches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(baseIncident);

    const incidentId = createRes.body.data.incident.id;

    const res = await request(app)
      .patch(`/api/v1/breaches/${incidentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notifiedUsers: true });

    expect(res.status).toBe(200);
    expect(res.body.data.incident.notifiedUsers).toBe(true);
    expect(res.body.data.incident.notifiedUsersAt).toBeDefined();
  });

  it('appends timeline entry on update', async () => {
    const { adminToken } = await setup();

    const createRes = await request(app)
      .post('/api/v1/breaches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(baseIncident);

    const incidentId = createRes.body.data.incident.id;

    const res = await request(app)
      .patch(`/api/v1/breaches/${incidentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ timelineNote: 'Isolated affected servers' });

    expect(res.status).toBe(200);
    expect(res.body.data.incident.timeline.length).toBe(2);
    expect(res.body.data.incident.timeline[1].action).toBe('Isolated affected servers');
  });

  it('sets resolvedAt when status is resolved', async () => {
    const { adminToken } = await setup();

    const createRes = await request(app)
      .post('/api/v1/breaches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(baseIncident);

    const incidentId = createRes.body.data.incident.id;

    const res = await request(app)
      .patch(`/api/v1/breaches/${incidentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'resolved' });

    expect(res.status).toBe(200);
    expect(res.body.data.incident.resolvedAt).toBeDefined();
  });

  it('returns 404 for incident from another org', async () => {
    const { adminToken: adminA } = await setup();
    const { adminToken: adminB } = await setup();

    const createRes = await request(app)
      .post('/api/v1/breaches')
      .set('Authorization', `Bearer ${adminA}`)
      .send(baseIncident);

    const incidentId = createRes.body.data.incident.id;

    const res = await request(app)
      .patch(`/api/v1/breaches/${incidentId}`)
      .set('Authorization', `Bearer ${adminB}`)
      .send({ status: 'investigating' });

    expect(res.status).toBe(404);
  });
});
