import { Injectable, Logger } from '@nestjs/common';

import { NotificationJob, NotificationChannel } from '@nestlancer/common';
import { PrismaWriteService } from '@nestlancer/database';
import { EmailJobType, publishEmailJob } from '@nestlancer/email';
import { QueuePublisherService } from '@nestlancer/queue';

import { NotificationMetricsService } from './notification-metrics.service';
import { NotificationPreferenceGateService } from './notification-preference-gate.service';
import { NotificationRetryService } from './notification-retry.service';
import { NotificationTemplateResolverService } from './notification-template-resolver.service';
import { PushProviderService } from './push-provider.service';
import { InAppNotificationProcessor } from '../processors/in-app-notification.processor';

/**
 * Orchestrator service for the Notification Worker.
 * Handles delivery of across multiple channels (In-App, Push, Email).
 * Manages user notification preference checks and channel-specific dispatching.
 */
@Injectable()
export class NotificationWorkerService {
  private readonly logger = new Logger(NotificationWorkerService.name);

  constructor(
    private readonly inAppProcessor: InAppNotificationProcessor,
    private readonly pushProvider: PushProviderService,
    private readonly prisma: PrismaWriteService,
    private readonly retryService: NotificationRetryService,
    private readonly queuePublisher: QueuePublisherService,
    private readonly templateResolver: NotificationTemplateResolverService,
    private readonly preferenceGate: NotificationPreferenceGateService,
    private readonly metrics: NotificationMetricsService,
  ) {}

  /**
   * Processes a notification job by dispatching to all requested channels.
   * Uses parallel execution (Promise.allSettled) for reliability across channels.
   *
   * @param job - The notification job containing content and target channels
   * @returns A promise that resolves when all delivery attempts have settled
   */
  async processNotification(job: NotificationJob): Promise<void> {
    const resolvedJob = await this.templateResolver.applyTemplate(job);
    const gate = await this.preferenceGate.shouldDeliver(resolvedJob);
    const notificationType =
      resolvedJob.notificationType ||
      (typeof resolvedJob.notification.data?.type === 'string'
        ? resolvedJob.notification.data.type
        : undefined) ||
      resolvedJob.type;

    if (!gate.allowed) {
      this.metrics.recordSkipped(gate.reason || 'blocked', notificationType);
      this.logger.debug(
        `[NotificationWorker] Skipped notification for UserID=${resolvedJob.userId} type=${notificationType} reason=${gate.reason}`,
      );
      return;
    }

    const { userId, channels = [NotificationChannel.IN_APP] } = resolvedJob;
    this.logger.log(
      `[NotificationWorker] Dispatching notification for UserID: ${userId} | Channels: ${channels.join(', ')}`,
    );

    const results = await Promise.allSettled(
      channels.map(async (channel) => {
        switch (channel) {
          case NotificationChannel.IN_APP:
            return this.inAppProcessor.process(resolvedJob);
          case NotificationChannel.PUSH:
            return this.processPushNotification(resolvedJob);
          case NotificationChannel.EMAIL:
            return this.processEmailNotification(resolvedJob);
          default:
            this.logger.warn(
              `[NotificationWorker] Channel ${channel} is currently not implemented/supported.`,
            );
        }
      }),
    );

    // Aggregate and log delivery results
    for (let i = 0; i < results.length; i++) {
      const res = results[i];
      if (res.status === 'rejected') {
        const channel = channels[i];
        this.logger.error(
          `[NotificationWorker] Failure in channel ${channel}: ${res.reason?.message || res.reason}`,
        );

        // For PUSH notifications, we trigger the retry service
        if (channel === NotificationChannel.PUSH) {
          await this.retryService.handleFailure(resolvedJob, res.reason);
        }
      }
    }
  }

  /**
   * Handles push notification delivery to all registered devices of a user.
   * Automatically prunes invalid/expired subscriptions based on provider feedback.
   *
   * @param job - The notification job containing content
   * @returns A promise that resolves when all push attempts are complete
   */
  private async processEmailNotification(job: NotificationJob): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: job.userId },
      select: { email: true, firstName: true },
    });
    if (!user?.email) {
      this.logger.warn(
        `[NotificationWorker] No email for user ${job.userId}, skipping EMAIL channel`,
      );
      return;
    }

    await publishEmailJob(this.queuePublisher, {
      type: EmailJobType.NOTIFICATION,
      to: user.email,
      data: {
        userName: user.firstName || 'there',
        title: job.notification.title,
        body: job.notification.message,
        link: job.notification.actionUrl,
      },
    });
  }

  private async processPushNotification(job: NotificationJob): Promise<void> {
    const subscriptions = await this.prisma.userPushSubscription.findMany({
      where: { userId: job.userId },
    });

    if (subscriptions.length === 0) {
      this.logger.debug(`[NotificationWorker] No push tokens found for UserID: ${job.userId}`);
      return;
    }

    for (const sub of subscriptions) {
      const success = await this.pushProvider.sendNotification(sub.subscription, {
        title: job.notification.title,
        body: job.notification.message,
        data: {
          url: job.notification.actionUrl,
          type: job.type,
        },
      });

      if (!success) {
        // Subscription is stale, remove from database
        this.logger.log(`[NotificationWorker] Pruning invalid push subscription ID: ${sub.id}`);
        await this.prisma.userPushSubscription.delete({ where: { id: sub.id } });
      }
    }
  }
}
