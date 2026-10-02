import { Logger } from '@nestjs/common';

import { QUEUE_AUDIT } from '@nestlancer/common';
import { QueuePublisherService } from '@nestlancer/queue';

export type AuditQueueEntry = {
  action: string;
  category: string;
  description: string;
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  impersonatedBy?: string;
  createdAt?: string;
};

export async function publishAuditEntry(
  publisher: QueuePublisherService,
  entry: AuditQueueEntry,
  queueName = process.env.AUDIT_QUEUE_NAME || QUEUE_AUDIT,
): Promise<void> {
  await publisher.sendToQueue(queueName, {
    ...entry,
    createdAt: entry.createdAt ?? new Date().toISOString(),
  });
}

/** Fire-and-forget audit publish — must not block auth or user flows. */
export function publishAuditEntrySafe(
  publisher: QueuePublisherService,
  entry: AuditQueueEntry,
  logger?: Pick<Logger, 'warn'>,
): void {
  void publishAuditEntry(publisher, entry).catch((err: Error) => {
    logger?.warn?.(`Failed to publish audit entry ${entry.action}: ${err.message}`);
  });
}
