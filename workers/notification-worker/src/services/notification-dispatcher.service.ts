import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { mapToNotificationJobs } from '@nestlancer/notifications';

import { AdminRecipientResolverService } from './admin-recipient-resolver.service';
import { NotificationEnrichmentService } from './notification-enrichment.service';
import { NotificationMetricsService } from './notification-metrics.service';
import { NotificationWorkerService } from './notification-worker.service';

const ADMIN_ROUTING_PREFIXES = [
  'request.request.',
  'quote.quote.accepted',
  'quote.quote.declined',
  'quote.changes.',
  'contact.inquiry.',
  'payment.dispute.opened',
  'payment.payment.completed',
  'project.feedback.',
  'project.revision.',
  'blog.comment.',
  'message.message.flagged',
  'progress.revision.requested',
  'media.media.quarantined',
  'webhook.delivery.',
  'user.account.deletion_scheduled',
];

function needsAdminRecipients(routingKey: string | undefined): boolean {
  if (!routingKey) return false;
  return ADMIN_ROUTING_PREFIXES.some(
    (prefix) => routingKey === prefix || routingKey.startsWith(prefix),
  );
}

/**
 * Normalizes queue messages (NotificationJob, outbox payloads, legacy shapes) and dispatches delivery.
 */
@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);

  constructor(
    private readonly worker: NotificationWorkerService,
    private readonly enrichment: NotificationEnrichmentService,
    private readonly adminResolver: AdminRecipientResolverService,
    private readonly configService: ConfigService,
    private readonly metrics: NotificationMetricsService,
  ) {}

  async dispatch(routingKey: string | undefined, raw: unknown): Promise<void> {
    const payload = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};

    const enriched = await this.enrichment.enrich(payload);
    const adminIds = needsAdminRecipients(routingKey)
      ? await this.adminResolver.getAllAdminIds()
      : undefined;

    const jobs = mapToNotificationJobs(routingKey, enriched, {
      frontendUrl: this.configService.get<string>('notificationWorker.frontendUrl'),
      adminUrl: this.configService.get<string>('notificationWorker.adminUrl'),
      adminIds,
    });

    if (jobs.length === 0) {
      this.metrics.recordMapperEmpty(routingKey || 'unknown');
      this.logger.debug(
        `[NotificationDispatcher] No mappable notification jobs for routingKey=${routingKey ?? 'n/a'}`,
      );
      return;
    }

    for (const job of jobs) {
      await this.worker.processNotification(job);
    }
  }
}
