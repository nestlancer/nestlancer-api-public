import { generateUuid, isValidUuid } from '../../../src/utils/uuid.util';

describe('UuidUtils', () => {
  describe('generateUuid', () => {
    it('should generate a valid UUID v7', () => {
      const uuid = generateUuid();
      expect(isValidUuid(uuid)).toBe(true);
    });

    it('should generate unique values', () => {
      const uuid1 = generateUuid();
      const uuid2 = generateUuid();
      expect(uuid1).not.toBe(uuid2);
    });

    it('should generate time-ordered UUIDs (v7)', () => {
      const uuid1 = generateUuid();
      const uuid2 = generateUuid();
      // UUID v7 are time-ordered, so uuid2 should be lexicographically >= uuid1
      expect(uuid2 >= uuid1).toBe(true);
    });
  });

  describe('isValidUuid', () => {
    it('should return true for valid UUID v7', () => {
      const v7uuid = generateUuid();
      expect(isValidUuid(v7uuid)).toBe(true);
    });

    it('should return true for valid UUID v4 (backwards compatible)', () => {
      expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUuid('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
    });

    it('should return false for invalid UUIDs', () => {
      expect(isValidUuid('invalid-uuid')).toBe(false);
      expect(isValidUuid('550e8400e29b41d4a716446655440000')).toBe(false); // no dashes
      expect(isValidUuid('')).toBe(false);
    });
  });
});
