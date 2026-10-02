import { createHash, randomBytes } from 'crypto';

/** Creates a SHA-256 hash of input (used for storing tokens) */
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** Generates a cryptographically secure random token */
export function generateToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/** Generates a random verification code (numeric) */
export function generateVerificationCode(length: number = 6): string {
  const max = Math.pow(10, length);
  const code = Math.floor(Math.random() * max);
  return code.toString().padStart(length, '0');
}
