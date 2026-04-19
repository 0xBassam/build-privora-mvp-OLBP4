process.env.NODE_ENV = 'test';
process.env.ENCRYPTION_KEY = 'test_32_char_key_for_unit_tests!!';
process.env.JWT_SECRET = 'test_jwt_secret_for_unit_tests_ok';
process.env.JWT_ACCESS_EXPIRES = '15m';
process.env.JWT_REFRESH_EXPIRES = '7d';
process.env.OTP_EXPIRES_MINUTES = '10';
process.env.OTP_LENGTH = '6';
process.env.FRONTEND_URL = 'http://localhost:3000';

const { setupTestDb, closeTestDb } = require('../helpers/testDb');

// Mock email service to prevent real email sends
jest.mock('../../src/services/emailService', () => ({
  sendOtpEmail: jest.fn().mockResolvedValue({ messageId: 'test-msg-id' }),
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'test-msg-id' }),
}));

let request;
let app;
let models;

beforeAll(async () => {
  models = await setupTestDb();
  app = require('../../src/app');
  request = require('supertest');
});

afterAll(async () => {
  await closeTestDb();
});

// ─── Health check ─────────────────────────────────────────────────────────────
describe('GET /api/v1/health', () => {
  it('returns 200 healthy', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
  });
});

// ─── OTP Login Flow ────────────────────────────────────────────────────────────
describe('POST /api/v1/auth/request-otp', () => {
  it('accepts a valid email and returns 200', async () => {
    const res = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ email: 'testuser@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('rejects an invalid email with 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('auto-creates a user account on first OTP request', async () => {
    const email = 'newuser@example.com';
    await request(app).post('/api/v1/auth/request-otp').send({ email });

    const user = await models.User.findOne({ where: { email } });
    expect(user).not.toBeNull();
    expect(user.role).toBe('user');
  });
});

describe('POST /api/v1/auth/verify-otp', () => {
  it('returns JWT tokens on correct OTP', async () => {
    const email = 'verify-test@example.com';
    const crypto = require('crypto');

    // Control the generated OTP via spy
    const spy = jest.spyOn(crypto, 'randomInt').mockReturnValue(123456);
    await request(app).post('/api/v1/auth/request-otp').send({ email });
    spy.mockRestore();

    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ email, otp: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.user.email).toBe(email);
  });

  it('returns 401 for a wrong OTP', async () => {
    const email = 'wrong-otp@example.com';
    await request(app).post('/api/v1/auth/request-otp').send({ email });

    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ email, otp: '000000' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for missing otp field', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(400);
  });
});

// ─── Admin Login ───────────────────────────────────────────────────────────────
describe('POST /api/v1/auth/admin/login', () => {
  it('returns tokens for valid admin credentials', async () => {
    const org = await models.Organization.create({
      name: 'Test Org', contactEmail: 'org@test.com',
    });
    await models.User.create({
      email: 'admin@test.com',
      name: 'Admin',
      role: 'org_admin',
      organizationId: org.id,
      passwordHash: 'Admin@1234',
      isEmailVerified: true,
    });

    const res = await request(app)
      .post('/api/v1/auth/admin/login')
      .send({ email: 'admin@test.com', password: 'Admin@1234' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data.user.role).toBe('org_admin');
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/admin/login')
      .send({ email: 'admin@test.com', password: 'WrongPass@999' });

    expect(res.status).toBe(401);
  });

  it('returns 401 when user role is "user" (not admin)', async () => {
    const email = 'regular@test.com';
    await models.User.create({ email, name: 'Regular', role: 'user', passwordHash: 'Pass@1234' });

    const res = await request(app)
      .post('/api/v1/auth/admin/login')
      .send({ email, password: 'Pass@1234' });

    expect(res.status).toBe(401);
  });

  it('returns 400 for short password in request body', async () => {
    const res = await request(app)
      .post('/api/v1/auth/admin/login')
      .send({ email: 'admin@test.com', password: 'short' });

    expect(res.status).toBe(400);
  });
});

// ─── Token Refresh ────────────────────────────────────────────────────────────
describe('POST /api/v1/auth/refresh', () => {
  it('issues a new access token for a valid refresh token', async () => {
    const crypto = require('crypto');
    const email = 'refresh-test@example.com';

    // Control the OTP value
    const spy = jest.spyOn(crypto, 'randomInt').mockReturnValue(654321);
    await request(app).post('/api/v1/auth/request-otp').send({ email });
    spy.mockRestore();

    const loginRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ email, otp: '654321' });

    expect(loginRes.status).toBe(200);
    const { refreshToken } = loginRes.body.data;

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
  });

  it('returns 401 for a bogus refresh token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'bogus-token-value' });

    expect(res.status).toBe(401);
  });

  it('returns 400 when refreshToken field is missing', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({});
    expect(res.status).toBe(400);
  });
});
