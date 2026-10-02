import { Test, TestingModule } from '@nestjs/testing';
import { MemoryHealthIndicator } from '../../../src/indicators/memory.indicator';

describe('MemoryHealthIndicator', () => {
  let indicator: MemoryHealthIndicator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MemoryHealthIndicator],
    }).compile();

    indicator = module.get<MemoryHealthIndicator>(MemoryHealthIndicator);
  });

  it('should return healthy status', async () => {
    const result = await indicator.check();
    expect(result.status).toBe('healthy');
    expect(result.responseTime).toBeDefined();
  });
});
