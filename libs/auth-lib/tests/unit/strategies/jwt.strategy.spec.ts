import { JwtStrategy } from '../../../src/strategies/jwt.strategy';

/** Test RSA public key (same as `.env.test` JWT_ACCESS_PUBLIC_KEY). */
const TEST_JWT_ACCESS_PUBLIC_KEY =
  '-----BEGIN PUBLIC KEY-----\\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsrYYAIHjHvtREpYIs5QA\\nHrInZn5ECnTaLh4d5K0VXIqMWJ3rhJ+6zQGKkwgJOSqkDwVRwmbywjCh+eH03pCT\\n7dbFKHosk2pEirCBNMnH2fADG0XNKhqnW3fqDJxKF/rVy90odq3/rIMFkL4zSqZB\\n5oo+Y2yKgS6KRZbogLHYBr5g9ICwZHQeC7WN/GBlJfsQymzeMVSJih3CvrI7zi5c\\n7jBBwv8ixQciHPCEVz3yEVvHHxNiNbPERgqfL1Qq+s+m25On2L4ZXxkuzpXFgQM6\\nL0O38cA+N85KZnpoY1Pznu7E1rUu5Na44mZmz+aqMIK/IxA6y1FHapJiOL16iccu\\nGQIDAQAB\\n-----END PUBLIC KEY-----\\n';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    process.env.JWT_ACCESS_PUBLIC_KEY = TEST_JWT_ACCESS_PUBLIC_KEY;
    strategy = new JwtStrategy();
  });

  afterEach(() => {
    delete process.env.JWT_ACCESS_PUBLIC_KEY;
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should validate and return the user payload', async () => {
    const payload = {
      sub: 'user-1',
      email: 'test@example.com',
      role: 'user',
      iat: 123456,
      exp: 789012,
    };

    const result = await strategy.validate(payload);

    expect(result).toEqual({
      userId: 'user-1',
      sub: 'user-1',
      email: 'test@example.com',
      role: 'user',
      portal: undefined,
      jti: undefined,
      iat: 123456,
      exp: 789012,
      isImpersonated: false,
      impersonationSessionId: undefined,
      originalAdminId: undefined,
    });
  });

  it('passes through impersonation claims', async () => {
    const payload = {
      sub: 'user-1',
      email: 'test@example.com',
      role: 'USER',
      type: 'access',
      portal: 'client' as const,
      isImpersonated: true,
      impersonationSessionId: 'imp-sess-1',
      originalAdminId: 'admin-1',
      jti: 'access-jti',
      iat: 123456,
      exp: 789012,
    };

    const result = await strategy.validate(payload);

    expect(result.isImpersonated).toBe(true);
    expect(result.impersonationSessionId).toBe('imp-sess-1');
    expect(result.originalAdminId).toBe('admin-1');
  });
});
