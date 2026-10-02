import { registerAs } from '@nestjs/config';

export const auditConfig = registerAs('audit', () => ({
  batchSize: parseInt(process.env.AUDIT_BATCH_SIZE ?? '100', 10),
  flushIntervalMs: parseInt(process.env.AUDIT_FLUSH_INTERVAL_MS ?? '5000', 10),
  maxBufferSize: parseInt(process.env.AUDIT_MAX_BUFFER_SIZE ?? '1000', 10),
  fallbackFilePath: process.env.AUDIT_FALLBACK_FILE_PATH ?? '/tmp/audit-fallback.jsonl',
  retryOnFailure: process.env.AUDIT_RETRY_ON_FAILURE !== 'false',
  queueName: process.env.AUDIT_QUEUE_NAME ?? 'audit.queue',
}));
