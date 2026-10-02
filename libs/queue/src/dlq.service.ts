import { Injectable, Logger } from '@nestjs/common';
import { QueuePublisherService } from './queue-publisher.service';

@Injectable()
export class DlqService {
  private readonly logger = new Logger(DlqService.name);

  constructor(private readonly publisher: QueuePublisherService) {}

  async sendToDlq(originalQueue: string, message: unknown, error: string): Promise<void> {
    const dlqPayload = { originalQueue, message, error, failedAt: new Date().toISOString() };
    await this.publisher.sendToQueue(`${originalQueue}.dlq`, dlqPayload);
    this.logger.warn(`Message sent to DLQ: ${originalQueue}.dlq`);
  }
}
