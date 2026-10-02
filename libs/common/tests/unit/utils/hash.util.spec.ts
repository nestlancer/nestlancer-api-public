import { sha256, generateToken, generateVerificationCode } from '../../../src/utils/hash.util';

describe('HashUtil', () => {
  describe('sha256', () => {
    it('should create a valid sha256 hash', () => {
      const input = 'test-input';
      const hash = sha256(input);
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
      // Double check consistency
      expect(sha256(input)).toBe(hash);
    });
  });

  describe('generateToken', () => {
    it('should generate a token of specified length', () => {
      const token = generateToken(16);
      expect(token).toHaveLength(32); // Hex string is twice the byte length
    });

    it('should generate a default 32 byte token', () => {
      const token = generateToken();
      expect(token).toHaveLength(64);
    });
  });

  describe('generateVerificationCode', () => {
    it('should generate a 6-digit numeric code', () => {
      const code = generateVerificationCode();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^\d+$/);
    });

    it('should generate a code of specified length', () => {
      const code = generateVerificationCode(4);
      expect(code).toHaveLength(4);
      expect(code).toMatch(/^\d+$/);
    });
  });
});
