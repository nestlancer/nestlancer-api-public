import { registerAs } from '@nestjs/config';

export const webhooksConfig = registerAs('webhooks', () => ({
  razorpaySecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  cloudflareSecret: process.env.CLOUDFLARE_WEBHOOK_SECRET,
  maxRetryAttempts: parseInt(process.env.WEBHOOK_MAX_RETRIES || '5', 10),
  retryBackoffMultiplier: parseInt(process.env.WEBHOOK_RETRY_BACKOFF_MULTIPLIER || '3', 10),
  deadLetterTtlDays: parseInt(process.env.WEBHOOK_DEAD_LETTER_TTL_DAYS || '30', 10),
  rawBodySizeLimit: process.env.WEBHOOK_RAW_BODY_SIZE_LIMIT || '1mb',
}));
