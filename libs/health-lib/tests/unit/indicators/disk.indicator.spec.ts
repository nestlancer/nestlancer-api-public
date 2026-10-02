import { Test, TestingModule } from '@nestjs/testing';
import { DiskHealthIndicator } from '../../../src/indicators/disk.indicator';

describe('DiskHealthIndicator', () => {
  let indicator: DiskHealthIndicator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiskHealthIndicator],
    }).compile();

    indicator = module.get<DiskHealthIndicator>(DiskHealthIndicator);
  });

  it('should return healthy status', async () => {
    const result = await indicator.check();
    expect(result.status).toBe('healthy');
    expect(result.responseTime).toBeDefined();
  });
});
