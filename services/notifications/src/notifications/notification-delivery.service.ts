import { Injectable, Logger } from '@nestjs/common';
import { QueuePublisherService } from '@nestlancer/queue';

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(private readonly queuePublisher: QueuePublisherService) {}

  async deliver(notification: any, channels: string[]) {
    const results = [];

    for (const channel of channels) {
      try {
        if (channel === 'EMAIL') {
          // Push to email queue
          await this.queuePublisher.publish(
            'nestlancer.events',
            'email.notification',
            notification,
          );
        } else if (channel === 'IN_APP') {
          // Will be handled natively or via websocket pub/sub
        } else if (channel === 'PUSH') {
          // Handled via Web Push
        }

        results.push({ channel, success: true });
      } catch (error: any) {
        this.logger.error(`Failed to deliver notification to channel ${channel}`, error);
        results.push({ channel, success: false, error: error.message });
      }
    }

    return results;
  }
}
