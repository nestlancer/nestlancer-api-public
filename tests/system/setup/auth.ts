/**
 * Auth helpers for system smoke tests.
 *
 * Wraps the shared `@nestlancer/testing` JWT helper so that system tests
 * mint tokens the same way per-package E2E tests do — no copy-paste, no drift.
 *
 * The secret is read from `JWT_ACCESS_SECRET` (validated in env.ts, so it is
 * guaranteed to be present when this module is imported inside a test).
 */

import {
  createTestJwt,
  type TestJwtPayload,
} from '../../../libs/testing/src/helpers/test-auth.helper';

/**
 * Mint a short-lived access token for use in system smoke requests.
 *
 * @param userId  Stable test user ID (defaults to a smoke-test placeholder).
 * @param role    JWT `role` claim (defaults to `'USER'`).
 */
export function mintSystemToken(
  userId = 'system-smoke-e2e-user',
  role: TestJwtPayload['role'] = 'USER',
): string {
  const secret = process.env.JWT_ACCESS_SECRET!;
  return createTestJwt(
    { sub: userId, email: `${userId}@system-smoke.local`, role },
    { secret, expiresIn: '5m' },
  );
}

/**
 * Convenience: return a `Bearer <token>` string for HTTP Authorization headers.
 */
export function bearerToken(userId?: string, role?: string): string {
  return `Bearer ${mintSystemToken(userId, role)}`;
}
