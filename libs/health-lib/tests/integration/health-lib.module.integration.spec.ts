import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseHealthIndicator } from '../../src/indicators/database.indicator';
import { RedisHealthIndicator } from '../../src/indicators/redis.indicator';
import { ConfigModule } from '@nestjs/config';

process.env.DATABASE_URL ||= 'postgresql://127.0.0.1:5432/postgres';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-12345';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-12345';
process.env.REDIS_CACHE_URL ||= 'redis://127.0.0.1:6379';
process.env.NODE_ENV = 'test';

describe('HealthLibModule (Integration)', () => {
  let module: TestingModule;
  let dbIndicator: DatabaseHealthIndicator;
  let redisIndicator: RedisHealthIndicator;

  beforeAll(async () => {
    const { HealthLibModule } = await import('../../src/health-lib.module');
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
        HealthLibModule,
      ],
    }).compile();

    dbIndicator = module.get<DatabaseHealthIndicator>(DatabaseHealthIndicator);
    redisIndicator = module.get<RedisHealthIndicator>(RedisHealthIndicator);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(dbIndicator).toBeDefined();
    expect(redisIndicator).toBeDefined();
  });

  describe('DatabaseHealthIndicator', () => {
    it('should return a healthy status with responseTime', async () => {
      const result = await dbIndicator.check();

      expect(result).toBeDefined();
      expect(result.status).toBe('healthy');
      expect(typeof result.responseTime).toBe('number');
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should return the correct shape from check()', async () => {
      const result = await dbIndicator.check();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('responseTime');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
    });
  });

  describe('RedisHealthIndicator', () => {
    it('should return a healthy status with responseTime', async () => {
      const result = await redisIndicator.check();

      expect(result).toBeDefined();
      expect(result.status).toBe('healthy');
      expect(typeof result.responseTime).toBe('number');
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should return the correct shape from check()', async () => {
      const result = await redisIndicator.check();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('responseTime');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
    });
  });
});
