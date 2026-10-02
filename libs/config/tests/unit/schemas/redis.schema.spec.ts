import { redisConfigSchema } from '../../../src/schemas/redis.schema';

describe('RedisConfig Schema', () => {
  it('should validate correct REDIS_URL', () => {
    const data = { REDIS_URL: 'redis://localhost:6379' };
    const result = redisConfigSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should fail with invalid REDIS_URL', () => {
    const data = { REDIS_URL: 'invalid-url' };
    const result = redisConfigSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
