import { rateLimitConfigSchema } from '../../../src/schemas/rate-limit.schema';

describe('RateLimitConfig Schema', () => {
  it('should populate all defaults if empty input', () => {
    const result = rateLimitConfigSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.RATE_LIMIT_ANONYMOUS).toBe(100);
      expect(result.data.RATE_LIMIT_USER).toBe(1000);
    }
  });

  it('should override defaults correctly', () => {
    const result = rateLimitConfigSchema.safeParse({ RATE_LIMIT_ANONYMOUS: '200' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.RATE_LIMIT_ANONYMOUS).toBe(200); // coerced from string to number
    }
  });
});
