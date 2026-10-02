import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { OutboxRepository } from './outbox.repository';

/**
 * Outbox poller that periodically polls the outbox table for pending events
 * and publishes them to RabbitMQ via the queue publisher service.
 */
@Injectable()
export class OutboxPollerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPollerService.name);
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private isProcessing = false;

  // Queue publisher injected by the consuming module
  private queuePublisher: any;

  constructor(private readonly outboxRepository: OutboxRepository) {}

  setQueuePublisher(publisher: any): void {
    this.queuePublisher = publisher;
  }

  onModuleInit(): void {
    if (!this.queuePublisher) {
      this.logger.log(
        'Embedded outbox poller disabled (no queue publisher wired; use worker/outbox-poller)',
      );
      return;
    }

    const pollInterval = Number(process.env.OUTBOX_POLL_INTERVAL || 5000);
    this.intervalHandle = setInterval(() => this.poll(), pollInterval);
    this.logger.log(`Outbox poller started (interval: ${pollInterval}ms)`);
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.logger.log('Outbox poller stopped');
  }

  private async poll(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const batchSize = Number(process.env.OUTBOX_BATCH_SIZE || 100);
      const events = await this.outboxRepository.findPending(batchSize);

      if (events.length === 0) {
        this.isProcessing = false;
        return;
      }

      this.logger.debug(`Processing ${events.length} pending outbox events`);

      for (const event of events) {
        try {
          if (!this.queuePublisher) {
            this.logger.warn(
              `Skipping outbox event ${event.id}: embedded poller has no queue publisher`,
            );
            continue;
          }

          const exchange = process.env.OUTBOX_EXCHANGE || 'events';
          await this.queuePublisher.publish(exchange, event.type, {
            type: event.type,
            aggregateId: event.aggregateId,
            aggregateType: event.aggregateType,
            payload: event.payload,
            timestamp: new Date().toISOString(),
          });

          await this.outboxRepository.markPublished(event.id);
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          this.logger.error(`Failed to publish outbox event ${event.id}: ${errMsg}`);
          await this.outboxRepository.markFailed(event.id, errMsg);
        }
      }
    } catch (error) {
      this.logger.error(
        'Outbox poller error',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.isProcessing = false;
    }
  }
}
