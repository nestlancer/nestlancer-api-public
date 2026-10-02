import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhookProvider } from '../interfaces/webhook-provider.interface';
import { WebhookEvent } from '../interfaces/webhook-event.interface';
import * as crypto from 'crypto';

@Injectable()
export class RazorpayProvider implements WebhookProvider {
  private readonly logger = new Logger(RazorpayProvider.name);
  readonly name = 'razorpay';
  private readonly secret: string;

  constructor(private readonly configService: ConfigService) {
    this.secret = this.configService.get<string>('webhooks.razorpaySecret') ?? '';
    if (!this.secret) {
      this.logger.warn('RAZORPAY_WEBHOOK_SECRET is not configured');
    }
  }

  verifySignature(rawBody: Buffer, headers: Record<string, string>): boolean {
    const signature = headers['x-razorpay-signature'];
    if (!signature || !this.secret) {
      this.logger.warn('Missing Razorpay signature or secret configuration');
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.secret)
        .update(rawBody)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(expectedSignature, 'utf8'),
      );
    } catch (err: any) {
      this.logger.error('Error verifying Razorpay signature', err);
      return false;
    }
  }

  parseEvent(payload: Record<string, any>, headers: Record<string, string>): WebhookEvent {
    let targetQueue = 'payments.webhook.queue';

    if (payload.event?.startsWith('payment.')) {
      targetQueue = 'payments.webhook.queue';
    } else if (payload.event?.startsWith('refund.')) {
      targetQueue = 'payments.webhook.queue';
    } else if (payload.event?.startsWith('dispute.')) {
      targetQueue = 'payments.webhook.queue';
    }

    return {
      provider: this.name,
      eventType: payload.event,
      eventId: headers['x-razorpay-event-id'] || null,
      timestamp: payload.created_at ? new Date(payload.created_at * 1000) : new Date(),
      data: payload,
      targetQueue,
    };
  }
}
