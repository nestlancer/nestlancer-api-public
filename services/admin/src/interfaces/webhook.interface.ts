import { Webhook } from '../entities/webhook.entity';
import { WebhookDelivery } from '../entities/webhook-delivery.entity';

export interface WebhookConfig extends Webhook {}

export interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  responseTime: number;
  error?: string;
  attempts: number;
}

export interface WebhookEventData {
  provider: string;
  eventType: string;
  eventId: string;
  timestamp: string;
  data: any;
}
