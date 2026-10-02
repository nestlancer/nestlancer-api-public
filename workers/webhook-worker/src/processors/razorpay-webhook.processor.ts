import { Injectable } from '@nestjs/common';

import { PrismaWriteService } from '@nestlancer/database';
import { LoggerService } from '@nestlancer/logger';
import { Processor, Process } from '@nestlancer/queue';

import { IncomingWebhookJob } from '../interfaces/webhook-job.interface';
import { WebhookWorkerService } from '../services/webhook-worker.service';

@Processor('payments.webhook')
@Injectable()
export class RazorpayWebhookProcessor {
  constructor(
    private readonly logger: LoggerService,
    private readonly webhookService: WebhookWorkerService,
    private readonly prisma: PrismaWriteService,
  ) {}

  @Process()
  async handleRazorpay(job: IncomingWebhookJob): Promise<void> {
    this.logger.log(`Processing Razorpay event: ${job.eventType}`);

    try {
      await this.webhookService.dispatch('razorpay', job.eventType, job.payload);

      await this.prisma.webhookLog.update({
        where: { id: job.incomingWebhookId },
        data: { status: 'PROCESSED', processedAt: new Date() },
      });
    } catch (error: any) {
      this.logger.error(`Error processing Razorpay event ${job.eventType}: ${error.message}`);
      await this.prisma.webhookLog.update({
        where: { id: job.incomingWebhookId },
        data: { status: 'FAILED', error: error.message },
      });
      throw error;
    }
  }
}
