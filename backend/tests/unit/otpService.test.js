// Set test environment variables before any require
process.env.NODE_ENV = 'test';
process.env.ENCRYPTION_KEY = 'test_32_char_key_for_unit_tests!!';
process.env.JWT_SECRET = 'test_jwt_secret_for_unit_tests_ok';
process.env.OTP_EXPIRES_MINUTES = '10';
process.env.OTP_LENGTH = '6';

const { setupTestDb, closeTestDb } = require('../helpers/testDb');

describe('OTP Service', () => {
  let models;

  beforeAll(async () => {
    models = await setupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  describe('createOtp()', () => {
    it('returns a 6-digit numeric string', async () => {
      const { createOtp } = require('../../src/services/otpService');
      const otp = await createOtp('otp-test@example.com', '127.0.0.1');
      expect(otp).toMatch(/^\d{6}$/);
    });

    it('invalidates previous OTPs for the same email', async () => {
      const { createOtp } = require('../../src/services/otpService');
      const { OtpCode } = models;
      const email = 'otp-invalidate@example.com';

      await createOtp(email);
      await createOtp(email); // second call should invalidate first

      const activeCodes = await OtpCode.count({ where: { email, isUsed: false } });
      expect(activeCodes).toBe(1); // only the latest should be active
    });

    it('stores a hash, not the plaintext OTP', async () => {
      const { createOtp } = require('../../src/services/otpService');
      const { OtpCode } = models;
      const email = 'otp-hash@example.com';

      const otp = await createOtp(email);
      const record = await OtpCode.findOne({ where: { email, isUsed: false } });

      expect(record.codeHash).not.toBe(otp);
      expect(record.codeHash).toMatch(/^\$2/); // bcrypt hash prefix
    });
  });

  describe('verifyOtp()', () => {
    it('returns valid:true for a correct OTP', async () => {
      const { createOtp, verifyOtp } = require('../../src/services/otpService');
      const email = 'otp-valid@example.com';

      const otp = await createOtp(email);
      const result = await verifyOtp(email, otp);

      expect(result.valid).toBe(true);
    });

    it('marks OTP as used after successful verification', async () => {
      const { createOtp, verifyOtp } = require('../../src/services/otpService');
      const { OtpCode } = models;
      const email = 'otp-used@example.com';

      const otp = await createOtp(email);
      await verifyOtp(email, otp);

      const record = await OtpCode.findOne({ where: { email } });
      expect(record.isUsed).toBe(true);
    });

    it('returns valid:false for a wrong OTP', async () => {
      const { createOtp, verifyOtp } = require('../../src/services/otpService');
      const email = 'otp-wrong@example.com';

      await createOtp(email);
      const result = await verifyOtp(email, '000000');

      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('returns valid:false when no active OTP exists', async () => {
      const { verifyOtp } = require('../../src/services/otpService');
      const result = await verifyOtp('no-otp@example.com', '123456');

      expect(result.valid).toBe(false);
    });

    it('rejects an already-used OTP', async () => {
      const { createOtp, verifyOtp } = require('../../src/services/otpService');
      const email = 'otp-replay@example.com';

      const otp = await createOtp(email);
      await verifyOtp(email, otp); // first use
      const result = await verifyOtp(email, otp); // replay

      expect(result.valid).toBe(false);
    });
  });
});
