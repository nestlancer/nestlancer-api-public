import { registerAs } from '@nestjs/config';

/**
 * PEM keys stored as single-line strings in `.env` files contain the literal
 * sequence `\n` instead of real newlines. Node's dotenv loader doesn't unescape
 * them, but the `jsonwebtoken` library needs real line breaks to parse PEM —
 * otherwise it throws "secretOrPrivateKey must be an asymmetric key when using RS256".
 */
function normalizePemKey(value: string | undefined): string | undefined {
  if (!value) return value;
  return value.replace(/\\n/g, '\n');
}

export interface AuthServiceConfig {
  jwt: {
    accessPublicKey: string | undefined;
    accessPrivateKey: string | undefined;
    accessExpiresIn: number;
    refreshPublicKey: string | undefined;
    refreshPrivateKey: string | undefined;
    refreshExpiresIn: number;
    issuer: string;
    audience: string;
  };
  security: {
    bcryptSaltRounds: number;
    maxFailedAttempts: number;
    lockoutDurationMs: number;
    failedLoginCooldownWindowMs: number;
    otpExpiresInMs: number;
  };
  turnstile: {
    secretKey: string | undefined;
    bypassToken: string | undefined;
  };
  tokens: {
    emailVerificationExpiresIn: number;
    passwordResetExpiresIn: number;
  };
}

export default registerAs(
  'authService',
  (): AuthServiceConfig => ({
    jwt: {
      accessPublicKey: normalizePemKey(process.env.JWT_ACCESS_PUBLIC_KEY),
      accessPrivateKey: normalizePemKey(process.env.JWT_ACCESS_PRIVATE_KEY),
      accessExpiresIn: parseInt(process.env.JWT_ACCESS_EXPIRES_IN || '900', 10), // 15 mins
      refreshPublicKey: normalizePemKey(process.env.JWT_REFRESH_PUBLIC_KEY),
      refreshPrivateKey: normalizePemKey(process.env.JWT_REFRESH_PRIVATE_KEY),
      refreshExpiresIn: parseInt(process.env.JWT_REFRESH_EXPIRES_IN || '604800', 10), // 7 days
      issuer: process.env.JWT_ISSUER || 'nestlancer-auth',
      audience: process.env.JWT_AUDIENCE || 'nestlancer-api',
    },
    security: {
      // Cost 10 is OWASP-acceptable and ~4× faster than 12 under tight CPU caps.
      bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
      maxFailedAttempts: parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS || '5', 10),
      lockoutDurationMs: parseInt(process.env.LOCKOUT_DURATION_MS || '1800000', 10), // 30 mins
      failedLoginCooldownWindowMs: parseInt(
        process.env.FAILED_LOGIN_COOLDOWN_WINDOW_MS || '3600000',
        10,
      ), // 1 hour
      otpExpiresInMs: parseInt(process.env.OTP_EXPIRES_IN_MS || '300000', 10), // 5 mins
    },
    turnstile: {
      secretKey: process.env.TURNSTILE_SECRET_KEY,
      bypassToken: process.env.TURNSTILE_BYPASS_TOKEN, // For local dev testing
    },
    tokens: {
      emailVerificationExpiresIn: parseInt(process.env.EMAIL_VERIFY_EXPIRES_IN || '86400', 10), // 24 hours
      passwordResetExpiresIn: parseInt(process.env.PASSWORD_RESET_EXPIRES_IN || '3600', 10), // 1 hour
    },
  }),
);
