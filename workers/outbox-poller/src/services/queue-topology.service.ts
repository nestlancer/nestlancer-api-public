import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  EXCHANGE_EVENTS,
  QUEUE_DOCUMENT,
  QUEUE_EMAIL,
  QUEUE_EXPORT,
  QUEUE_NOTIFICATION,
} from '@nestlancer/common';
import { getEventsExchange, PROJECTS_LIFECYCLE_BINDINGS } from '@nestlancer/outbox';
import { QueuePublisherService } from '@nestlancer/queue';

const PROJECTS_LIFECYCLE_QUEUE = 'projects.lifecycle.queue';

/**
 * Asserts RabbitMQ exchanges and queue bindings used by the outbox publisher.
 * Idempotent — safe to run on every outbox-poller startup.
 */
@Injectable()
export class QueueTopologyService implements OnModuleInit {
  private readonly logger = new Logger(QueueTopologyService.name);

  constructor(
    private readonly queuePublisher: QueuePublisherService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.queuePublisher.ensureChannel();
      await this.setupTopology();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Queue topology setup skipped (${msg}); will retry on next publish cycle`);
    }
  }

  private async setupTopology(): Promise<void> {
    const channel = await this.queuePublisher.ensureChannel();
    const eventsExchange = getEventsExchange();
    const legacyExchange =
      this.configService.get<string>('RABBITMQ_EXCHANGE_EVENTS') === 'events' ? 'events' : null;

    await channel.assertExchange(eventsExchange, 'topic', { durable: true });
    if (legacyExchange && legacyExchange !== eventsExchange) {
      await channel.assertExchange(legacyExchange, 'topic', { durable: true });
    }
    await channel.assertExchange('nestlancer.dlx', 'fanout', { durable: true });

    const emailQueue = process.env.EMAIL_QUEUE_NAME || QUEUE_EMAIL;
    const notificationQueue = process.env.NOTIFICATION_QUEUE_NAME || QUEUE_NOTIFICATION;
    const lifecycleQueue = process.env.PROJECTS_LIFECYCLE_QUEUE || PROJECTS_LIFECYCLE_QUEUE;
    const documentQueue = process.env.DOCUMENT_QUEUE_NAME || QUEUE_DOCUMENT;
    const exportQueue = process.env.EXPORT_QUEUE_NAME || QUEUE_EXPORT;

    await channel.assertQueue(emailQueue, { durable: true });
    await channel.assertQueue(notificationQueue, { durable: true });
    await channel.assertQueue(lifecycleQueue, { durable: true });
    await channel.assertQueue(documentQueue, { durable: true });
    await channel.assertQueue(exportQueue, { durable: true });

    const emailBindings = [
      'email.*',
      'auth.user.registered',
      'auth.password.reset_requested',
      'email.verification',
      'email.welcome',
      'email.contact-response',
      'quote.quote.declined',
      'message.message.sent',
      'quote.quote.sent',
      'quote.quote.accepted',
      'payment.payment.completed',
      'payment.payment.initiated',
      'payment.payment.reminder',
      'project.project.completed',
      'contact.message.received',
      'PAYMENT_COMPLETED',
      'QUOTE_ACCEPTED',
    ];

    const documentBindings = [
      'quote.quote.sent',
      'document.quote.revised',
      'quote.quote.accepted',
      'payment.payment.completed',
      'payment.payment.initiated',
      'payment.payment.reminder',
      'QUOTE_SENT',
      'QUOTE_REVISION_CREATED',
      'QUOTE_ACCEPTED',
      'PAYMENT_COMPLETED',
      'PAYMENT_REQUESTED',
      'MANUAL_PAYMENT_CREATED',
      'PAYMENT_REMINDER',
    ];

    const exportBindings = [
      'export.user.data',
      'export.project',
      'export.revenue',
      'USER_DATA_EXPORT_REQUESTED',
      'PROJECT_EXPORT_REQUESTED',
      'REVENUE_EXPORT_REQUESTED',
      'BLOG_POSTS_EXPORT_REQUESTED',
      'AUDIT_EXPORT',
    ];

    const notificationBindings = [
      'notification.*',
      // Admin send/segment publishes notification.notification.created (3 segments; notification.* is only 2)
      'notification.notification.*',
      'notification.#',
      'payment.payment.*',
      'payment.dispute.*',
      'quote.quote.*',
      'quote.changes.*',
      'project.status.*',
      'project.project.*',
      'project.revision.*',
      'project.deadline.*',
      'project.duplication.*',
      'project.feedback.*',
      'request.request.*',
      'request.status.*',
      'request.assigned',
      'message.message.*',
      'progress.milestone.*',
      'progress.revision.*',
      'contact.response.*',
      'progress.deliverable.*',
      'progress.entry.*',
      'contact.inquiry.*',
      'contact.message.*',
      'user.account.*',
      'user.security.*',
      'export.*.completed',
      'export.job.completed',
      'document.*.ready',
      'document.generation.ready',
      'media.media.*',
      'webhook.delivery.*',
      'auth.password.*',
      'blog.comment.*',
      'PAYMENT_COMPLETED',
      'PROJECT_STATUS_CHANGED',
      'REQUEST_SUBMITTED',
      'QUOTE_SENT',
      'QUOTE_ACCEPTED',
    ];

    const exchanges = legacyExchange ? [eventsExchange, legacyExchange] : [eventsExchange];

    for (const exchange of exchanges) {
      for (const key of emailBindings) {
        await channel.bindQueue(emailQueue, exchange, key);
      }
      for (const key of notificationBindings) {
        await channel.bindQueue(notificationQueue, exchange, key);
      }
      for (const key of PROJECTS_LIFECYCLE_BINDINGS) {
        await channel.bindQueue(lifecycleQueue, exchange, key);
      }
      for (const key of documentBindings) {
        await channel.bindQueue(documentQueue, exchange, key);
      }
      for (const key of exportBindings) {
        await channel.bindQueue(exportQueue, exchange, key);
      }
    }

    await channel.assertExchange('admin', 'topic', { durable: true });
    await channel.bindQueue(exportQueue, 'admin', 'AUDIT_EXPORT');

    this.logger.log(
      `RabbitMQ topology ready: exchanges=[${exchanges.join(', ')}], queues=[${emailQueue}, ${notificationQueue}, ${lifecycleQueue}, ${documentQueue}, ${exportQueue}]`,
    );
  }
}
