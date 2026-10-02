import { Injectable, Logger } from '@nestjs/common';

import { CdnWorkerService } from '../services/cdn-worker.service';

@Injectable()
export class PathInvalidationProcessor {
  private readonly logger = new Logger(PathInvalidationProcessor.name);

  constructor(private readonly cdnWorkerService: CdnWorkerService) {}

  async process(paths: string[]) {
    this.logger.log(`Processing path invalidation for ${paths.length} paths`);
    for (const path of paths) {
      await this.cdnWorkerService.invalidatePath(path);
    }
  }
}
