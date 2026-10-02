import { registerAs } from '@nestjs/config';

/** Queue names used by webhooks service when dispatching (must match services/webhooks). */
export const WEBHOOK_QUEUE_PAYMENTS = 'payments.webhook.queue';
export const WEBHOOK_QUEUE_SYSTEM = 'system.webhook.queue';

export default registerAs('webhook-worker', () => ({
  /** Queues to consume; must match targetQueue in webhooks ingestion. */
  queues: [WEBHOOK_QUEUE_PAYMENTS, WEBHOOK_QUEUE_SYSTEM],
  outgoingTimeoutMs: parseInt(process.env.OUTGOING_TIMEOUT_MS || '10000', 10),
  maxRetries: parseInt(process.env.WEBHOOK_WORKER_MAX_RETRIES || '5', 10),
  backoffBaseSeconds: parseInt(process.env.BACKOFF_BASE_SECONDS || '10', 10),
  backoffMultiplier: parseInt(process.env.BACKOFF_MULTIPLIER || '3', 10),
}));
