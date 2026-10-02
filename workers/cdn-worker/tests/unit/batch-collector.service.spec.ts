import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { BatchCollectorService } from '../../src/services/batch-collector.service';

describe('BatchCollectorService', () => {
  let service: BatchCollectorService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'cdn.batchWindowMs') return 100;
      if (key === 'cdn.maxBatchSize') return 2;
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BatchCollectorService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get<BatchCollectorService>(BatchCollectorService);
    service.onModuleInit();
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('should batch and deduplicate paths', (done) => {
    const flushedBatches: string[][] = [];
    service.setFlushCallback(async (paths) => {
      flushedBatches.push(paths);
      if (flushedBatches.length === 2) {
        expect(flushedBatches[0]).toEqual(['/path1', '/path2']);
        expect(flushedBatches[1]).toEqual(['/path3']);
        done();
      }
    });

    service.add('/path1');
    service.add('/path1'); // Duplicate
    service.add('/path2');
    service.add('/path3');
  });

  it('should respect max batch size', (done) => {
    service.setFlushCallback(async (paths) => {
      expect(paths.length).toBeLessThanOrEqual(2);
      if (paths.includes('/path3')) {
        done();
      }
    });

    service.addBatch(['/path1', '/path2', '/path3']);
  });
});
