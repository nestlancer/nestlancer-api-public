import { Injectable, Logger } from '@nestjs/common';
import { QueuePublisherService } from '@nestlancer/queue';
import { WebhookEvent } from '../interfaces/webhook-event.interface';

@Injectable()
export class WebhookDispatcherService {
  private readonly logger = new Logger(WebhookDispatcherService.name);

  constructor(private readonly queueService: QueuePublisherService) {}

  async dispatch(event: WebhookEvent, rawPayloadId: string): Promise<boolean> {
    if (!event.targetQueue) {
      this.logger.warn(
        `No target queue defined for event ${event.eventType} from ${event.provider}`,
      );
      return false;
    }

    try {
      await this.queueService.sendToQueue(event.targetQueue, {
        provider: event.provider,
        eventType: event.eventType,
        eventId: event.eventId,
        timestamp: event.timestamp.toISOString(),
        rawPayloadId,
        data: event.data,
      });

      this.logger.log(`Dispatched event ${event.eventId || 'null'} to ${event.targetQueue}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to dispatch event to ${event.targetQueue}`, error);
      throw error;
    }
  }
}
