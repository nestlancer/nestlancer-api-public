import { EXCHANGE_EVENTS } from '@nestlancer/common';

/**
 * Maps Outbox.type (SCREAMING_SNAKE in DB) → event-catalog routing keys on nestlancer.events.
 * @see docs/architecture/event-catalog.md
 */
export const OUTBOX_TYPE_TO_ROUTING_KEY: Record<string, string> = {
  PAYMENT_COMPLETED: 'payment.payment.completed',
  PAYMENT_DISPUTED: 'payment.dispute.opened',
  PAYMENT_DISPUTE_RESOLVED: 'payment.dispute.resolved',
  PAYMENT_REQUESTED: 'payment.payment.initiated',
  PAYMENT_REMINDER: 'payment.payment.reminder',
  MANUAL_PAYMENT_CREATED: 'payment.payment.initiated',
  MILESTONE_PAYMENT_RELEASED: 'payment.payment.completed',
  PROJECT_STATUS_CHANGED: 'project.status.changed',
  PROJECT_CREATED: 'project.project.created',
  PROJECT_APPROVED: 'project.project.created',
  PROJECT_PROGRESS_PUBLISHED: 'progress.milestone.completed',
  QUOTE_ACCEPTED: 'quote.quote.accepted',
  QUOTE_SENT: 'quote.quote.sent',
  // Draft create must not notify the client — only QUOTE_SENT does.
  QUOTE_CREATED: 'quote.quote.created',
  QUOTE_REVISION_CREATED: 'document.quote.revised',
  USER_DATA_EXPORT_REQUESTED: 'export.user.data',
  REVENUE_EXPORT_REQUESTED: 'export.revenue',
  PROJECT_EXPORT_REQUESTED: 'export.project',
  QUOTE_CHANGES_REQUESTED: 'quote.changes.requested',
  QUOTE_DECLINED: 'quote.quote.declined',
  QUOTE_REVISION_REQUESTED: 'quote.changes.requested',
  REQUEST_SUBMITTED: 'request.request.submitted',
  REQUEST_STATUS_UPDATED: 'request.status.changed',
  REQUEST_ASSIGNED: 'request.assigned',
  PROJECT_COMPLETED: 'project.project.completed',
  PROJECT_REVISION_REQUESTED: 'project.revision.requested',
  PROJECT_DEADLINE_EXTENDED: 'project.deadline.extended',
  PROJECT_DUPLICATION_REQUESTED: 'project.duplication.requested',
  PAYMENT_REFUNDED: 'payment.payment.refunded',
  BLOG_COMMENT_CREATED: 'blog.comment.created',
  COMMENT_REPORTED: 'blog.comment.reported',
  ADMIN_FORCE_PASSWORD_RESET: 'user.security.force_reset',
  ADMIN_USER_PASSWORD_RESET: 'user.security.password_reset',
  ADMIN_USER_DELETED: 'user.account.deleted',
  ADMIN_USER_RESTORED: 'user.account.restored',
  ADMIN_USER_ROLE_CHANGED: 'user.account.role_changed',
  USER_DELETION_REQUESTED: 'user.account.deletion_scheduled',
  USER_DELETION_CANCELLED: 'user.account.deletion_cancelled',
  EXPORT_COMPLETED: 'export.job.completed',
  DOCUMENT_READY: 'document.generation.ready',
  MEDIA_QUARANTINED: 'media.media.quarantined',
  MEDIA_RELEASED: 'media.media.released',
  QUOTE_EXPIRING_SOON: 'quote.quote.expiring',
  QUOTE_EXPIRED: 'quote.quote.expired',
  QUOTE_EXTENDED: 'quote.quote.extended',
  PROJECT_SUSPENDED: 'project.project.suspended',
  PROJECT_RESUMED: 'project.project.resumed',
  CONTRACT_SIGNED: 'document.contract.signed',
  WEBHOOK_DELIVERY_FAILED: 'webhook.delivery.failed',
  PROJECT_FEEDBACK_SUBMITTED: 'project.feedback.submitted',
  MESSAGE_SENT: 'message.message.sent',
  MESSAGE_MENTIONED: 'message.message.mentioned',
  MESSAGE_FLAGGED: 'message.message.flagged',
  GROUP_MEMBER_ADDED: 'message.group.member_added',
  CONTACT_INQUIRY_RECEIVED: 'contact.inquiry.received',
  CONTACT_RESPONSE_SENT: 'contact.response.sent',
  USER_REGISTERED: 'auth.user.registered',
  PASSWORD_RESET_REQUESTED: 'auth.password.reset_requested',
  PASSWORD_RESET_COMPLETED: 'auth.password.changed',
  EMAIL_VERIFICATION_RESENT: 'email.verification',
  USER_EMAIL_VERIFIED: 'email.welcome',
  NOTIFICATION_ENQUEUE: 'notification.notification.created',
  MILESTONE_COMPLETED: 'progress.milestone.completed',
  MILESTONE_APPROVED: 'progress.milestone.approved',
  MILESTONE_REVISION_REQUESTED: 'progress.revision.requested',
  MILESTONE_MARKED_COMPLETE: 'progress.milestone.completed',
  PROGRESS_ENTRY_CREATED: 'progress.entry.created',
  DELIVERABLE_UPLOADED: 'progress.deliverable.uploaded',
  DELIVERABLE_APPROVED: 'progress.deliverable.approved',
  BLOG_POSTS_EXPORT_REQUESTED: 'export.blog.posts',
  PROJECT_DUPLICATION_COMPLETED: 'project.duplication.completed',
  ADMIN_USER_STATUS_CHANGED: 'user.account.suspended',
};

/** Canonical topic exchange for domain events (ADR-004 / queue-topology.md). */
export function getEventsExchange(): string {
  return (
    process.env.RABBITMQ_EVENTS_EXCHANGE || process.env.RABBITMQ_EXCHANGE_EVENTS || EXCHANGE_EVENTS
  );
}

/** Legacy routing keys still emitted by older publishers/consumers. */
export const LEGACY_OUTBOX_ROUTING_KEYS = [
  'QUOTE_ACCEPTED',
  'PAYMENT_COMPLETED',
  'PROJECT_STATUS_CHANGED',
  'PROJECT_CREATED',
] as const;

export interface OutboxRoutingTarget {
  exchange: string;
  routingKey: string;
}

/**
 * Resolves exchange + routing key for an outbox row before RabbitMQ publish.
 */
export function resolveOutboxRouting(outboxType: string): OutboxRoutingTarget {
  const catalogKey = OUTBOX_TYPE_TO_ROUTING_KEY[outboxType];

  if (catalogKey) {
    return { exchange: getEventsExchange(), routingKey: catalogKey };
  }

  const routingKey = outboxType;

  if (routingKey.startsWith('payment.') && !routingKey.startsWith('payment.payment.')) {
    return { exchange: 'nestlancer.payments', routingKey };
  }
  if (routingKey.startsWith('notification.')) {
    return { exchange: 'nestlancer.notifications', routingKey };
  }
  if (routingKey.startsWith('email.')) {
    return { exchange: 'nestlancer.email', routingKey };
  }
  if (routingKey.startsWith('message.')) {
    return { exchange: 'nestlancer.messaging', routingKey };
  }
  if (routingKey.startsWith('media.')) {
    return { exchange: 'nestlancer.media', routingKey };
  }
  if (routingKey.startsWith('cdn.')) {
    return { exchange: 'nestlancer.cdn', routingKey };
  }

  return { exchange: getEventsExchange(), routingKey };
}

/** Bindings for projects.lifecycle.queue (topic exchange). */
export const PROJECTS_LIFECYCLE_BINDINGS = [
  'quote.quote.accepted',
  'QUOTE_ACCEPTED',
  'payment.payment.completed',
  'PAYMENT_COMPLETED',
  'project.status.changed',
  'PROJECT_STATUS_CHANGED',
  'project.project.created',
  'PROJECT_CREATED',
  'project.duplication.requested',
  'PROJECT_DUPLICATION_REQUESTED',
] as const;
