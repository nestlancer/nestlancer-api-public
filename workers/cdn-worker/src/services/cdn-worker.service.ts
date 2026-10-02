import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { BatchCollectorService } from './batch-collector.service';
import { CloudflareInvalidationService } from './cloudflare-invalidation.service';

@Injectable()
export class CdnWorkerService implements OnModuleInit {
  private readonly logger = new Logger(CdnWorkerService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly cloudflareService: CloudflareInvalidationService,
    private readonly batchCollector: BatchCollectorService,
  ) {}

  onModuleInit() {
    this.batchCollector.setFlushCallback(async (paths) => {
      await this.invalidateBatch(paths);
    });
  }

  async invalidatePath(path: string) {
    this.batchCollector.add(path);
  }

  async invalidateBatch(paths: string[]) {
    this.logger.log(`Processing batch of ${paths.length} paths`);
    try {
      const result = await this.cloudflareService.invalidate(paths);
      this.logger.log(`Successfully invalidated batch. Invalidation ID: ${result.id}`);
    } catch (e: any) {
      const error = e as Error;
      this.logger.error(`Failed to invalidate batch: ${error.message}`, error.stack);
      throw error;
    }
  }

  async purgeAll() {
    this.logger.log('Processing purge all');
    try {
      await this.cloudflareService.purgeAll();
      this.logger.log('Successfully purged all cache');
    } catch (e: any) {
      const error = e as Error;
      this.logger.error(`Failed to purge all cache: ${error.message}`, error.stack);
      throw error;
    }
  }
}
