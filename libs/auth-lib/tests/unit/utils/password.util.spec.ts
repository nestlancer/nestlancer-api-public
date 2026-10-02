import { validatePasswordStrength } from '../../../src/utils/password.util';

// Mocking @nestlancer/common to avoid dependency issues during unit tests if needed
// However, since it's just a regex, we can ideally just use it if accessible
jest.mock('@nestlancer/common', () => ({
  REGEX: {
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  },
}));

describe('PasswordUtil', () => {
  describe('validatePasswordStrength', () => {
    it('should return valid true for a strong password', () => {
      const result = validatePasswordStrength('StrongPass123!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid false for a short password', () => {
      const result = validatePasswordStrength('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters');
    });

    it('should return valid false if missing uppercase', () => {
      const result = validatePasswordStrength('weakpass123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain uppercase, lowercase, number, and special character',
      );
    });

    it('should return valid false if missing special character', () => {
      const result = validatePasswordStrength('WeakPass123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain uppercase, lowercase, number, and special character',
      );
    });
  });
});
