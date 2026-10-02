export class WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, any>;
  status: 'PENDING' | 'DELIVERED' | 'FAILED';
  httpStatus?: number | null;
  responseBody?: string | null;
  attempts: number;
  lastAttemptAt?: Date | null;
  nextRetryAt?: Date | null;
  deliveredAt?: Date | null;
  error?: string | null;
  createdAt: Date;
}
