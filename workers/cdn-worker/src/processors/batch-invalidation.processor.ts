import { Injectable, Logger } from '@nestjs/common';

import { CdnWorkerService } from '../services/cdn-worker.service';

@Injectable()
export class BatchInvalidationProcessor {
  private readonly logger = new Logger(BatchInvalidationProcessor.name);

  constructor(private readonly cdnWorkerService: CdnWorkerService) {}

  async process(paths: string[]) {
    this.logger.log(`Processing batch invalidation for ${paths.length} paths`);
    await this.cdnWorkerService.invalidateBatch(paths);
  }
}
