import { Test, TestingModule } from '@nestjs/testing';

import { BatchInvalidationProcessor } from '../../../src/processors/batch-invalidation.processor';
import { CdnWorkerService } from '../../../src/services/cdn-worker.service';

describe('BatchInvalidationProcessor', () => {
  let processor: BatchInvalidationProcessor;
  let cdnWorkerService: jest.Mocked<CdnWorkerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchInvalidationProcessor,
        {
          provide: CdnWorkerService,
          useValue: { invalidateBatch: jest.fn() },
        },
      ],
    }).compile();

    processor = module.get<BatchInvalidationProcessor>(BatchInvalidationProcessor);
    cdnWorkerService = module.get(CdnWorkerService);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('should process batch invalidation', async () => {
    const paths = ['/path1', '/path2'];
    await processor.process(paths);
    expect(cdnWorkerService.invalidateBatch).toHaveBeenCalledWith(paths);
  });
});
