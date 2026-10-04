/**
 * RS256 JWT keys for integration/e2e tests (matches auth-lib JwtStrategy).
 * Used when services load AppModule without .env.test.
 */
const TEST_JWT_ACCESS_PUBLIC_KEY =
  '-----BEGIN PUBLIC KEY-----\nREDACTED_FOR_SHARE_PACKAGE\n-----END PUBLIC KEY-----\n';

const TEST_JWT_ACCESS_PRIVATE_KEY =
  '-----BEGIN PRIVATE KEY-----\nREDACTED_FOR_SHARE_PACKAGE\n-----END PRIVATE KEY-----\n';

export function applyIntegrationJwtEnv(): void {
  process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-secret-32-chars-minimum!!';
  process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-32-chars!!';
  process.env.JWT_ACCESS_PUBLIC_KEY =
    process.env.JWT_ACCESS_PUBLIC_KEY || TEST_JWT_ACCESS_PUBLIC_KEY;
  process.env.JWT_ACCESS_PRIVATE_KEY =
    process.env.JWT_ACCESS_PRIVATE_KEY || TEST_JWT_ACCESS_PRIVATE_KEY;
  process.env.JWT_ISSUER = process.env.JWT_ISSUER || 'nestlancer-auth-test';
  process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'nestlancer-api-test';
}
