import { jwtConfigSchema } from '../../../src/schemas/jwt.schema';

describe('JwtConfig Schema', () => {
  it('should validate successfully', () => {
    const data = {
      JWT_ACCESS_SECRET: 'a_very_long_secret_key_which_is_over_32_chars!',
      JWT_REFRESH_SECRET: 'another_very_long_secret_key_which_is_over_32!',
    };
    const result = jwtConfigSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.JWT_ALGORITHM).toBe('HS256');
    }
  });

  it('should fail if secrets are too short', () => {
    const data = {
      JWT_ACCESS_SECRET: 'short',
      JWT_REFRESH_SECRET: 'short',
    };
    const result = jwtConfigSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
