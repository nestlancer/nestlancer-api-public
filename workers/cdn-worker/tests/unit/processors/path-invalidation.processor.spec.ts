import { Test, TestingModule } from '@nestjs/testing';

import { PathInvalidationProcessor } from '../../../src/processors/path-invalidation.processor';
import { CdnWorkerService } from '../../../src/services/cdn-worker.service';

describe('PathInvalidationProcessor', () => {
  let processor: PathInvalidationProcessor;
  let cdnWorkerService: jest.Mocked<CdnWorkerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PathInvalidationProcessor,
        {
          provide: CdnWorkerService,
          useValue: { invalidatePath: jest.fn() },
        },
      ],
    }).compile();

    processor = module.get<PathInvalidationProcessor>(PathInvalidationProcessor);
    cdnWorkerService = module.get(CdnWorkerService);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('should process path invalidation', async () => {
    const paths = ['/path1', '/path2'];
    await processor.process(paths);
    expect(cdnWorkerService.invalidatePath).toHaveBeenCalledTimes(2);
    expect(cdnWorkerService.invalidatePath).toHaveBeenCalledWith('/path1');
    expect(cdnWorkerService.invalidatePath).toHaveBeenCalledWith('/path2');
  });
});
