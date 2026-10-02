import { Test, TestingModule } from '@nestjs/testing';
import { BatchBufferService } from '../../src/services/batch-buffer.service';
import { ConfigService } from '@nestjs/config';

describe('BatchBufferService', () => {
  let service: BatchBufferService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchBufferService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key, defaultValue) => {
              if (key === 'audit.batchSize') return 2;
              if (key === 'audit.flushIntervalMs') return 5000;
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<BatchBufferService>(BatchBufferService);
  });

  it('should add items and return true when batch size reached', () => {
    expect(service.add({ action: '1' } as any)).toBe(false);
    expect(service.add({ action: '2' } as any)).toBe(true);
    expect(service.size()).toBe(2);
  });

  it('should drain the buffer', () => {
    service.add({ action: '1' } as any);
    const items = service.drain();
    expect(items.length).toBe(1);
    expect(service.size()).toBe(0);
  });
});
