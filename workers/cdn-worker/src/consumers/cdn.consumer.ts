import { Injectable, Logger } from '@nestjs/common';

import { ConsumeMessage } from 'amqplib';

import { QueueConsumerService } from '@nestlancer/queue';

import { CdnJob } from '../interfaces/cdn-job.interface';
import { CdnWorkerService } from '../services/cdn-worker.service';

@Injectable()
export class CdnConsumer {
  private readonly logger = new Logger(CdnConsumer.name);

  constructor(
    private readonly cdnWorkerService: CdnWorkerService,
    private readonly queueConsumer: QueueConsumerService,
  ) {}

  async onModuleInit() {
    await this.queueConsumer.consume('cdn.queue', async (msg: ConsumeMessage) =>
      this.handleMessage(msg),
    );
  }

  private async handleMessage(msg: ConsumeMessage) {
    const job: CdnJob = JSON.parse(msg.content.toString());
    this.logger.log(`Received CDN job: ${job.type}`);

    try {
      switch (job.type) {
        case 'INVALIDATE_PATH':
          if (job.paths && job.paths.length > 0) {
            await Promise.all(job.paths.map((path) => this.cdnWorkerService.invalidatePath(path)));
          }
          break;
        case 'INVALIDATE_BATCH':
          if (job.paths && job.paths.length > 0) {
            await this.cdnWorkerService.invalidateBatch(job.paths);
          }
          break;
        case 'PURGE_ALL':
          await this.cdnWorkerService.purgeAll();
          break;
        default:
          this.logger.warn(`Unknown CDN job type: ${job.type}`);
      }
    } catch (e: any) {
      const error = e as Error;
      this.logger.error(`Error processing CDN job ${job.type}: ${error.message}`, error.stack);
      // Re-throw to allow nack/dlq handled by base class
      throw error;
    }
  }
}
