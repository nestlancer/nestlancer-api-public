import { Injectable, Logger } from '@nestjs/common';

import { QueuePublisherService, DlqService } from '@nestlancer/queue';

/**
 * Service responsible for managing failed email delivery attempts.
 * Implements exponential backoff strategy by re-queueing messages with delays.
 * Sends messages to Dead Letter Queue (DLQ) if maximum retries are exceeded.
 */
@Injectable()
export class EmailRetryService {
  private readonly logger = new Logger(EmailRetryService.name);
  private readonly MAX_RETRIES = 3;

  constructor(
    private readonly publisher: QueuePublisherService,
    private readonly dlqService: DlqService,
  ) {}

  /**
   * Handles a failed email delivery attempt by scheduling a retry or moving to DLQ.
   *
   * @param queueName - The name of the primary email queue
   * @param message - The original job payload that failed
   * @param error - The error encountered during the last attempt
   * @returns A promise that resolves when the retry/DLQ operation is complete
   */
  async handleFailure(queueName: string, message: any, error: any): Promise<void> {
    const retryCount = (message.retryCount || 0) + 1;

    if (retryCount > this.MAX_RETRIES) {
      this.logger.error(
        `[EmailRetry] Max retries (${this.MAX_RETRIES}) exceeded for Job. Sending to DLQ.`,
        error,
      );
      await this.dlqService.sendToDlq(queueName, message, error.message);
      return;
    }

    const delay = this.getDelayForRetry(retryCount);
    this.logger.warn(
      `[EmailRetry] Delivery failed. Scheduling attempt #${retryCount} in ${delay}ms. Error: ${error.message}`,
    );

    const updatedMessage = { ...message, retryCount };

    // Re-queue the message with x-delay header (RabbitMQ Delayed Message Plugin)
    await this.publisher.sendToQueue(queueName, updatedMessage, {
      headers: { 'x-delay': delay },
    });
  }

  /**
   * Calculates the delay in milliseconds for the next retry attempt based on count.
   * Current strategy: 1min, 5min, 30min for first 3 retries.
   *
   * @param retryCount - The sequential number of the next attempt
   * @returns Delay in milliseconds
   */
  private getDelayForRetry(retryCount: number): number {
    const delays = [60000, 300000, 1800000];
    return delays[retryCount - 1] || delays[delays.length - 1];
  }
}
