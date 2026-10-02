import { Injectable, Logger } from '@nestjs/common';
import { OutboxRepository } from './outbox.repository';
import { OutboxEventPayload } from './interfaces/outbox-event.interface';

/** Creates outbox events within the same DB transaction as business logic (ADR-004) */
@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(private readonly repository: OutboxRepository) {}

  async createEvent(event: OutboxEventPayload, tx?: unknown): Promise<string> {
    const id = await this.repository.create(event, tx);
    this.logger.debug(
      `Outbox event created: ${event.type} for ${event.aggregateType}:${event.aggregateId}`,
    );
    return id;
  }
}
