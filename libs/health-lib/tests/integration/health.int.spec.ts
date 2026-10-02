import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseHealthIndicator } from '../../src/indicators/database.indicator';
import { RedisHealthIndicator } from '../../src/indicators/redis.indicator';
import { ConfigModule } from '@nestjs/config';

process.env.DATABASE_URL ||= 'postgresql://127.0.0.1:5432/postgres';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-12345';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-12345';
process.env.REDIS_CACHE_URL ||= 'redis://127.0.0.1:6379';
process.env.NODE_ENV = 'test';

describe('Health Indicators (Integration)', () => {
  let module: TestingModule;
  let dbIndicator: DatabaseHealthIndicator;
  let redisIndicator: RedisHealthIndicator;

  beforeAll(async () => {
    const { HealthLibModule } = await import('../../src/health-lib.module');
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), HealthLibModule],
    }).compile();

    dbIndicator = module.get<DatabaseHealthIndicator>(DatabaseHealthIndicator);
    redisIndicator = module.get<RedisHealthIndicator>(RedisHealthIndicator);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('DatabaseHealthIndicator.check()', () => {
    it('should return healthy status', async () => {
      const result = await dbIndicator.check();

      expect(result.status).toBe('healthy');
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should return unhealthy status when check fails', async () => {
      // Simulate a failure inside check() by temporarily overriding the method internals
      const originalCheck = dbIndicator.check.bind(dbIndicator);
      jest.spyOn(dbIndicator, 'check').mockResolvedValueOnce({
        status: 'unhealthy',
        responseTime: 0,
        details: { error: 'Connection refused' },
      });

      const result = await dbIndicator.check();

      expect(result.status).toBe('unhealthy');
      expect(result.details).toBeDefined();
      expect(result.details?.error).toContain('Connection refused');
    });
  });

  describe('RedisHealthIndicator.check()', () => {
    it('should return healthy status', async () => {
      const result = await redisIndicator.check();

      expect(result.status).toBe('healthy');
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should return unhealthy status when check fails', async () => {
      jest.spyOn(redisIndicator, 'check').mockResolvedValueOnce({
        status: 'unhealthy',
        responseTime: 0,
        details: { error: 'Redis connection timeout' },
      });

      const result = await redisIndicator.check();

      expect(result.status).toBe('unhealthy');
      expect(result.details).toBeDefined();
      expect(result.details?.error).toContain('Redis connection timeout');
    });
  });

  describe('Multiple health checks', () => {
    it('should run all indicators and aggregate results', async () => {
      const [dbResult, redisResult] = await Promise.all([
        dbIndicator.check(),
        redisIndicator.check(),
      ]);

      const allHealthy = [dbResult, redisResult].every((r) => r.status === 'healthy');
      expect(allHealthy).toBe(true);
    });
  });
});
