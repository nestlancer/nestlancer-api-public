import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { QueuePublisherService, DlqService } from '@nestlancer/queue';

@Injectable()
export class NotificationRetryService {
  private readonly logger = new Logger(NotificationRetryService.name);
  private readonly MAX_RETRIES = 3;

  constructor(
    private readonly publisher: QueuePublisherService,
    private readonly dlqService: DlqService,
    private readonly configService: ConfigService,
  ) {}

  async handleFailure(message: any, error: any): Promise<void> {
    const queueName =
      this.configService.get<string>('notificationWorker.rabbitmq.queue') || 'notification.queue';
    const retryCount = (message.retryCount || 0) + 1;

    if (retryCount > this.MAX_RETRIES) {
      this.logger.error(
        `[NotificationRetry] Max retries (${this.MAX_RETRIES}) exceeded for Job. Sending to DLQ.`,
        error,
      );
      await this.dlqService.sendToDlq(queueName, message, error.message);
      return;
    }

    const delay = this.getDelayForRetry(retryCount);
    this.logger.warn(
      `[NotificationRetry] Delivery failed. Scheduling attempt #${retryCount} in ${delay}ms. Error: ${error.message}`,
    );

    const updatedMessage = { ...message, retryCount };

    // RabbitMQ Delayed Message Plugin header
    await this.publisher.sendToQueue(queueName, updatedMessage, {
      headers: { 'x-delay': delay },
    });
  }

  private getDelayForRetry(retryCount: number): number {
    // 30s, 2m, 10m
    const delays = [30000, 120000, 600000];
    return delays[retryCount - 1] || delays[delays.length - 1];
  }
}
