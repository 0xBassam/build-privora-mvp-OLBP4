process.env.NODE_ENV = 'test';
process.env.ENCRYPTION_KEY = 'test_32_char_key_for_unit_tests!!';
process.env.JWT_SECRET = 'test_jwt_secret_for_unit_tests_ok';
process.env.JWT_ACCESS_EXPIRES = '15m';
process.env.JWT_REFRESH_EXPIRES = '7d';

const { setupTestDb, closeTestDb } = require('../helpers/testDb');
const { makeUser, makeOrganization } = require('../helpers/factories');

describe('Token Service', () => {
  let models;

  beforeAll(async () => {
    models = await setupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  describe('generateAccessToken()', () => {
    it('returns a signed JWT string', async () => {
      const { generateAccessToken } = require('../../src/services/tokenService');
      const user = await models.User.create(makeUser());

      const token = generateAccessToken(user);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // header.payload.signature
    });

    it('embeds userId, email, and role in the payload', async () => {
      const jwt = require('jsonwebtoken');
      const { generateAccessToken } = require('../../src/services/tokenService');
      const user = await models.User.create(makeUser({ role: 'org_admin' }));

      const token = generateAccessToken(user);
      const decoded = jwt.decode(token);

      expect(decoded.userId).toBe(user.id);
      expect(decoded.email).toBe(user.email);
      expect(decoded.role).toBe('org_admin');
    });
  });

  describe('generateRefreshToken()', () => {
    it('returns a hex string and persists a hashed record', async () => {
      const { generateRefreshToken } = require('../../src/services/tokenService');
      const user = await models.User.create(makeUser());

      const token = await generateRefreshToken(user.id, '127.0.0.1', 'test-agent');
      expect(typeof token).toBe('string');
      expect(token.length).toBe(128); // 64 bytes = 128 hex chars

      const record = await models.RefreshToken.findOne({ where: { userId: user.id } });
      expect(record).not.toBeNull();
      expect(record.tokenHash).not.toBe(token); // stored as hash
    });
  });

  describe('validateRefreshToken()', () => {
    it('returns the token record for a valid token', async () => {
      const { generateRefreshToken, validateRefreshToken } = require('../../src/services/tokenService');
      const user = await models.User.create(makeUser());

      const token = await generateRefreshToken(user.id, '127.0.0.1', 'ua');
      const record = await validateRefreshToken(token);

      expect(record).not.toBeNull();
      expect(record.userId).toBe(user.id);
    });

    it('returns null for a random token not in DB', async () => {
      const { validateRefreshToken } = require('../../src/services/tokenService');
      const result = await validateRefreshToken('a'.repeat(128));
      expect(result).toBeNull();
    });
  });

  describe('revokeRefreshToken()', () => {
    it('marks the token record as revoked', async () => {
      const { generateRefreshToken, validateRefreshToken, revokeRefreshToken } = require('../../src/services/tokenService');
      const user = await models.User.create(makeUser());

      const token = await generateRefreshToken(user.id, '127.0.0.1', 'ua');
      const record = await validateRefreshToken(token);
      await revokeRefreshToken(record);

      const updated = await models.RefreshToken.findByPk(record.id);
      expect(updated.isRevoked).toBe(true);
    });
  });
});
