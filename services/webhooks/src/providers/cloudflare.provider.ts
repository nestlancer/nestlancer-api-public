import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhookProvider } from '../interfaces/webhook-provider.interface';
import { WebhookEvent } from '../interfaces/webhook-event.interface';

@Injectable()
export class CloudflareProvider implements WebhookProvider {
  private readonly logger = new Logger(CloudflareProvider.name);
  readonly name = 'cloudflare';
  private readonly secret: string;

  constructor(private readonly configService: ConfigService) {
    this.secret = this.configService.get<string>('webhooks.cloudflareSecret') ?? '';
  }

  verifySignature(rawBody: Buffer, headers: Record<string, string>): boolean {
    const signature = headers['cf-webhook-auth'] || headers['x-cloudflare-signature'];
    if (!signature || !this.secret) {
      return false;
    }
    return signature === this.secret;
  }

  parseEvent(payload: Record<string, any>, headers: Record<string, string>): WebhookEvent {
    return {
      provider: this.name,
      eventType: payload.type || 'cache.purge',
      eventId: headers['cf-ray'] || null,
      timestamp: new Date(),
      data: payload,
      targetQueue: 'system.webhook.queue',
    };
  }
}
