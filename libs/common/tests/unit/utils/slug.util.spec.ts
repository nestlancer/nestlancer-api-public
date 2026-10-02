import { generateSlug, generateUniqueSlug } from '../../../src/utils/slug.util';

describe('SlugUtils', () => {
  describe('generateSlug', () => {
    it('should convert to lowercase and replace spaces with hyphens', () => {
      expect(generateSlug('Hello World')).toBe('hello-world');
    });

    it('should remove special characters', () => {
      expect(generateSlug('Hello @World!')).toBe('hello-world');
    });

    it('should trim whitespace', () => {
      expect(generateSlug('  Hello World  ')).toBe('hello-world');
    });

    it('should handle multiple spaces and underscores', () => {
      expect(generateSlug('hello   world__test')).toBe('hello-world-test');
    });

    it('should remove leading and trailing hyphens', () => {
      expect(generateSlug('--hello world--')).toBe('hello-world');
    });
  });

  describe('generateUniqueSlug', () => {
    it('should generate a slug with a random suffix', () => {
      const input = 'Hello World';
      const result = generateUniqueSlug(input);
      expect(result).toMatch(/^hello-world-[a-z0-9]{6}$/);
    });

    it('should generate different suffixes for the same input', () => {
      const input = 'test';
      const result1 = generateUniqueSlug(input);
      const result2 = generateUniqueSlug(input);
      expect(result1).not.toBe(result2);
    });
  });
});
