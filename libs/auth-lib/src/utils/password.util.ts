import { REGEX } from '@nestlancer/common';

export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < 8) errors.push('Password must be at least 8 characters');
  if (password.length > 128) errors.push('Password must be at most 128 characters');
  if (!REGEX.PASSWORD.test(password)) {
    errors.push('Password must contain uppercase, lowercase, number, and special character');
  }
  return { valid: errors.length === 0, errors };
}
