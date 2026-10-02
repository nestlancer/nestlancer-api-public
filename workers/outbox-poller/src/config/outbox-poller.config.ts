import { registerAs } from '@nestjs/config';

export default registerAs('outbox', () => ({
  /** Poll interval in ms; effective interval for fetching pending outbox events */
  pollingIntervalMs: parseInt(process.env.POLLING_INTERVAL_MS || '5000', 10),
  batchSize: parseInt(process.env.BATCH_SIZE || '100', 10),
  lockTtlSeconds: parseInt(process.env.LOCK_TTL_SECONDS || '10', 10),
  staleThresholdMinutes: parseInt(process.env.STALE_THRESHOLD_MINUTES || '60', 10),
  leaderLockKey: process.env.LEADER_LOCK_KEY || 'outbox:poller:lock',
  instanceId:
    process.env.OUTBOX_HOSTNAME || 'outbox-poller-' + Math.random().toString(36).substring(7),
  /** Max retries before marking an event as FAILED */
  maxRetries: parseInt(process.env.OUTBOX_MAX_RETRIES || '5', 10),
  /** Base delay in ms for exponential backoff between retries (delay = retryBackoffMs * 2^retries, capped by retryBackoffMaxMs) */
  retryBackoffMs: parseInt(process.env.OUTBOX_RETRY_BACKOFF_MS || '1000', 10),
  retryBackoffMaxMs: parseInt(process.env.OUTBOX_RETRY_BACKOFF_MAX_MS || '300000', 10),
}));
