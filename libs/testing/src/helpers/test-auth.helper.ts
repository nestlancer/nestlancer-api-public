import * as jwt from 'jsonwebtoken';

const DEFAULT_SECRET = process.env.JWT_ACCESS_SECRET || 'test-secret-key-for-testing-only-32char';

export interface TestJwtPayload {
  sub: string;
  email?: string;
  role?: string;
  permissions?: string[];
}

function normalizePem(value: string | undefined): string {
  return (value ?? '').replace(/\\n/g, '\n');
}

/**
 * Create a test JWT access token.
 *
 * When `JWT_ACCESS_PRIVATE_KEY` is set (docker dev / e2e / CI), signs RS256 tokens
 * that match auth-lib's JwtStrategy. Otherwise falls back to HS256 + JWT_ACCESS_SECRET
 * for lightweight unit tests.
 */
export function createTestJwt(
  payload: TestJwtPayload,
  options?: { secret?: string; expiresIn?: string },
): string {
  const expiresIn = options?.expiresIn || '1h';
  const claims = {
    sub: payload.sub,
    email: payload.email || `${payload.sub}@test.com`,
    role: payload.role || 'USER',
    permissions: payload.permissions || [],
    type: 'access' as const,
    jti: `test-${payload.sub}`,
    iat: Math.floor(Date.now() / 1000),
  };

  const privateKey = normalizePem(process.env.JWT_ACCESS_PRIVATE_KEY);
  if (privateKey.includes('BEGIN PRIVATE KEY')) {
    return jwt.sign(claims, privateKey, {
      algorithm: 'RS256',
      expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
      issuer: process.env.JWT_ISSUER || 'nestlancer-auth',
      audience: process.env.JWT_AUDIENCE || 'nestlancer-api',
    });
  }

  const secret = options?.secret || DEFAULT_SECRET;
  return jwt.sign(claims, secret, { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] });
}

/**
 * Create a test JWT refresh token.
 */
export function createTestRefreshToken(
  userId: string,
  options?: { secret?: string; expiresIn?: string },
): string {
  const secret =
    options?.secret || process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-32char-min-test';

  return jwt.sign({ sub: userId, type: 'refresh' }, secret, {
    expiresIn: (options?.expiresIn || '30d') as any,
  });
}

/**
 * Create an authorization header value for testing.
 */
export function createAuthHeader(payload: TestJwtPayload): string {
  return `Bearer ${createTestJwt(payload)}`;
}
