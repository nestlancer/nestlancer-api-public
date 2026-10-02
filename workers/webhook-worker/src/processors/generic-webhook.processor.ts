import { Injectable } from '@nestjs/common';

import { PrismaWriteService } from '@nestlancer/database';
import { LoggerService } from '@nestlancer/logger';
import { Processor, Process } from '@nestlancer/queue';

import { IncomingWebhookJob } from '../interfaces/webhook-job.interface';

@Processor('generic.webhook')
@Injectable()
export class GenericWebhookProcessor {
  constructor(
    private readonly logger: LoggerService,
    private readonly prisma: PrismaWriteService,
  ) {}

  @Process()
  async handleGeneric(job: IncomingWebhookJob): Promise<void> {
    this.logger.warn(`Received generic webhook event from ${job.provider}: ${job.eventType}`);

    await this.prisma.webhookLog.update({
      where: { id: job.incomingWebhookId },
      data: {
        status: 'FAILED',
        error: `Generic processor fallback for ${job.provider}`,
      },
    });
  }
}
