import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { WebhookIngestionService } from './webhook-ingestion.service';

@Injectable()
export class WebhookReplayService {
  private readonly logger = new Logger(WebhookReplayService.name);

  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly webhookIngestionService: WebhookIngestionService,
  ) {}

  async replay(webhookId: string): Promise<void> {
    const webhook = await this.prismaRead.webhookLog.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      throw new NotFoundException(`WebhookLog with ID ${webhookId} not found`);
    }

    this.logger.log(`Admin triggered replay for webhook log ${webhookId}`);

    await this.webhookIngestionService.processStoredWebhook(webhook as any);
  }
}
