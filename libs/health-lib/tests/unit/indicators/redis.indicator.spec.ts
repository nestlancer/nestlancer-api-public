import { Test, TestingModule } from '@nestjs/testing';
import { RedisHealthIndicator } from '../../../src/indicators/redis.indicator';

describe('RedisHealthIndicator', () => {
  let indicator: RedisHealthIndicator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisHealthIndicator],
    }).compile();

    indicator = module.get<RedisHealthIndicator>(RedisHealthIndicator);
  });

  it('should return healthy status', async () => {
    const result = await indicator.check();
    expect(result.status).toBe('healthy');
    expect(result.responseTime).toBeDefined();
  });
});
