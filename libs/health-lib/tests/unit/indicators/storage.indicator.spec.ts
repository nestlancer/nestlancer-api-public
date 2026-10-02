import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from '@nestlancer/storage';
import { StorageHealthIndicator } from '../../../src/indicators/storage.indicator';

describe('StorageHealthIndicator', () => {
  let indicator: StorageHealthIndicator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageHealthIndicator,
        {
          provide: StorageService,
          useValue: { checkConnection: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    indicator = module.get<StorageHealthIndicator>(StorageHealthIndicator);
  });

  it('should return healthy status', async () => {
    const result = await indicator.check();
    expect(result.status).toBe('healthy');
    expect(result.responseTime).toBeDefined();
  });
});
