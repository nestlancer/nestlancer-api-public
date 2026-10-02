import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseHealthIndicator } from '../../../src/indicators/database.indicator';

describe('DatabaseHealthIndicator', () => {
  let indicator: DatabaseHealthIndicator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DatabaseHealthIndicator],
    }).compile();

    indicator = module.get<DatabaseHealthIndicator>(DatabaseHealthIndicator);
  });

  it('should return healthy status', async () => {
    const result = await indicator.check();
    expect(result.status).toBe('healthy');
    expect(result.responseTime).toBeDefined();
  });
});
