import { Injectable, Logger } from '@nestjs/common';

import { resolveOutboxRouting } from '@nestlancer/outbox';
import { QueuePublisherService } from '@nestlancer/queue';

import { OutboxEvent } from '../interfaces/outbox-event.interface';

/**
 * Specialized publisher service for the Transactional Outbox.
 * Maps event types to their dedicated RabbitMQ exchanges.
 */
@Injectable()
export class OutboxPublisherService {
  private readonly logger = new Logger(OutboxPublisherService.name);

  constructor(private readonly queuePublisher: QueuePublisherService) {}

  /**
   * Publishes an outbox event to RabbitMQ with appropriate metadata.
   *
   * @param event - The outbox event record from the database
   * @returns A promise resolving when the event is confirmed by the broker
   */
  async publish(event: OutboxEvent): Promise<void> {
    const { exchange, routingKey } = resolveOutboxRouting(event.eventType);

    this.logger.debug(
      `[OutboxPublisher] Publishing EventID ${event.id} | type=${event.eventType} | Exchange: ${exchange} | Key: ${routingKey}`,
    );

    const payload =
      event.payload && typeof event.payload === 'object'
        ? (event.payload as Record<string, unknown>)
        : {};
    const correlationId =
      typeof payload.correlationId === 'string' && payload.correlationId
        ? payload.correlationId
        : typeof payload.correlation_id === 'string' && payload.correlation_id
          ? payload.correlation_id
          : event.id;

    await this.queuePublisher.publish(exchange, routingKey, event.payload, {
      messageId: event.id,
      correlationId,
      timestamp: event.createdAt.getTime(),
      persistent: true,
    });
  }
}
