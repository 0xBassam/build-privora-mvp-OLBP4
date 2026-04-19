const { encrypt, decrypt } = require('../../src/utils/encryption');

describe('Encryption Utils', () => {
  describe('encrypt()', () => {
    it('returns a non-empty ciphertext string', () => {
      const result = encrypt('hello@test.com');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('produces different ciphertext each call (IV randomness)', () => {
      const a = encrypt('same-value');
      const b = encrypt('same-value');
      expect(a).not.toBe(b);
    });

    it('returns null/undefined input unchanged', () => {
      expect(encrypt(null)).toBeNull();
      expect(encrypt(undefined)).toBeUndefined();
      expect(encrypt('')).toBe('');
    });
  });

  describe('decrypt()', () => {
    it('round-trips a plaintext string', () => {
      const plain = 'sensitive-national-id-1234567890';
      expect(decrypt(encrypt(plain))).toBe(plain);
    });

    it('round-trips an email address', () => {
      const email = 'user@example.sa';
      expect(decrypt(encrypt(email))).toBe(email);
    });

    it('returns null for garbage input', () => {
      expect(decrypt('not-valid-cipher')).toBeNull();
    });

    it('returns null/undefined unchanged', () => {
      expect(decrypt(null)).toBeNull();
      expect(decrypt(undefined)).toBeUndefined();
    });
  });
});
