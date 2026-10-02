import { corsConfigSchema } from '../../../src/schemas/cors.schema';

describe('CORS Config Schema', () => {
  it('should validate with default values', () => {
    const result = corsConfigSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        CORS_ORIGINS: 'http://localhost:3000',
        CORS_CREDENTIALS: true,
        CORS_MAX_AGE: 86400,
      });
    }
  });

  it('should parse boolean string for credentials', () => {
    const result = corsConfigSchema.safeParse({
      CORS_CREDENTIALS: 'false',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.CORS_CREDENTIALS).toBe(false);
    }
  });

  it('should coerce MAX_AGE to number', () => {
    const result = corsConfigSchema.safeParse({
      CORS_MAX_AGE: '3600',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.CORS_MAX_AGE).toBe(3600);
    }
  });
});
