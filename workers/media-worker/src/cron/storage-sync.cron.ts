import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { StorageService } from '@nestlancer/storage';

@Injectable()
export class StorageSyncCron {
  private readonly logger = new Logger(StorageSyncCron.name);
  private isRunning = false;

  constructor(private readonly storageService: StorageService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleSync() {
    if (this.isRunning) {
      this.logger.warn('Storage synchronization is already running, skipping this iteration');
      return;
    }

    const { primary, fallback } = this.storageService.getProviders();

    if (!primary || !fallback) {
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting cloud storage synchronization check...');

    try {
      // Check if primary is back online
      await primary.checkConnection();

      // @ts-expect-error - listPendingSync is specific to LocalProvider
      const pendingFiles = await fallback.listPendingSync();

      if (pendingFiles.length === 0) {
        this.logger.debug('No pending files found for synchronization');
        this.isRunning = false;
        return;
      }

      this.logger.log(`Found ${pendingFiles.length} files pending synchronization`);

      for (const file of pendingFiles) {
        try {
          this.logger.debug(`Synchronizing ${file.bucket}/${file.key}...`);

          // Download from fallback
          const content = await fallback.download(file.bucket, file.key);

          // Upload to primary
          await primary.upload(file.bucket, file.key, content, file.contentType);

          // Verify on primary
          const exists = await primary.exists(file.bucket, file.key);

          if (exists) {
            this.logger.log(
              `Successfully synchronized ${file.bucket}/${file.key}, removing local copy`,
            );
            await fallback.delete(file.bucket, file.key);
          } else {
            this.logger.error(`Verification failed for ${file.bucket}/${file.key} after upload`);
          }
        } catch (error: any) {
          this.logger.error(`Failed to synchronize ${file.bucket}/${file.key}: ${error.message}`);
        }
      }

      this.logger.log('Cloud storage synchronization iteration complete');
    } catch (error: any) {
      this.logger.warn(
        `Cloud storage (primary) is still unreachable or error occurred: ${error.message}`,
      );
    } finally {
      this.isRunning = false;
    }
  }
}
