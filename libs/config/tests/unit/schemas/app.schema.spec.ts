import { appConfigSchema } from '../../../src/schemas/app.schema';

describe('AppConfig Schema', () => {
  it('should validate correctly with valid data', () => {
    const data = {
      DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
      JWT_ACCESS_SECRET: 'supersecret_access_key_16_chars_!',
      JWT_REFRESH_SECRET: 'supersecret_refresh_key_16_chars!',
    };
    const result = appConfigSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe('development');
      expect(result.data.PORT).toBe(3000);
    }
  });

  it('should fail if missing required critical fields', () => {
    const data = {
      DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
      // missing JWT secrets
    };
    const result = appConfigSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should fail if JWT secret is too short', () => {
    const data = {
      DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
      JWT_ACCESS_SECRET: 'short',
      JWT_REFRESH_SECRET: 'short',
    };
    const result = appConfigSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
