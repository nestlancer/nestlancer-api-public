import { Test, TestingModule } from '@nestjs/testing';
import { RabbitmqHealthIndicator } from '../../../src/indicators/rabbitmq.indicator';

describe('RabbitmqHealthIndicator', () => {
  let indicator: RabbitmqHealthIndicator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RabbitmqHealthIndicator],
    }).compile();

    indicator = module.get<RabbitmqHealthIndicator>(RabbitmqHealthIndicator);
  });

  it('should return healthy status', async () => {
    const result = await indicator.check();
    expect(result.status).toBe('healthy');
    expect(result.responseTime).toBeDefined();
  });
});
