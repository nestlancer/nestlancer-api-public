import {
  NotificationChannel,
  NotificationJob,
  NotificationJobType,
  formatINR,
} from '@nestlancer/common';

import { defaultInAppChannels, isNotificationJob } from './is-notification-job';
import { NotificationEventType } from './notification-types';

export interface NotificationJobMapperContext {
  frontendUrl?: string;
  adminUrl?: string;
  adminIds?: string[];
}

function baseUrl(url: string | undefined, fallback = ''): string {
  const raw = (url || fallback).replace(/\/$/, '');
  if (!raw) return '';
  // Never leak local Infisical/dev URLs into production notification deep-links.
  try {
    const parsed = new URL(raw.includes('://') ? raw : `https://${raw}`);
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.endsWith('.local')
    ) {
      return '';
    }
  } catch {
    return '';
  }
  return raw;
}

/** Prefer absolute public URLs; fall back to in-app relative paths when env is misconfigured. */
function appPath(base: string, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}

function buildJob(params: {
  userId: string;
  notificationType: string;
  title: string;
  message: string;
  actionUrl?: string;
  data?: Record<string, unknown>;
  priority?: string;
  idempotencyKey?: string;
}): NotificationJob {
  return {
    type: NotificationJobType.IN_APP,
    userId: params.userId,
    notificationType: params.notificationType,
    channels: defaultInAppChannels(),
    priority: params.priority || 'NORMAL',
    idempotencyKey: params.idempotencyKey,
    notification: {
      title: params.title,
      message: params.message,
      actionUrl: params.actionUrl,
      data: { ...params.data, type: params.notificationType },
    },
  };
}

function adminJobs(
  adminIds: string[] | undefined,
  factory: (adminId: string) => NotificationJob | null,
): NotificationJob[] {
  if (!adminIds?.length) return [];
  const jobs: NotificationJob[] = [];
  for (const adminId of adminIds) {
    const job = factory(adminId);
    if (job) jobs.push(job);
  }
  return jobs;
}

function paymentRecordedTitle(amountLabel: string, projectTitle?: string): string {
  const project = projectTitle?.trim();
  if (amountLabel && project) return `${amountLabel} recorded for ${project}`;
  if (amountLabel) return `${amountLabel} recorded`;
  if (project) return `Payment recorded for ${project}`;
  return 'Payment recorded';
}

function formatAmount(amount: unknown, currency?: unknown): string {
  const numeric =
    typeof amount === 'number'
      ? amount
      : typeof amount === 'string' && amount.trim() !== ''
        ? Number(amount)
        : NaN;
  if (!Number.isFinite(numeric)) return '';
  const code = typeof currency === 'string' ? currency : 'INR';
  if (code === 'INR') return formatINR(numeric);
  return `${code} ${numeric}`;
}

/** Humanize SCREAMING_SNAKE / camel enums for notification copy (NL-NOTIF-002). */
function humanizeStatusLabel(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return 'updated';
  const spaced = raw
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
}

function isAdminRecipient(recipientId: string, adminIds?: string[]): boolean {
  return Boolean(recipientId && adminIds?.includes(recipientId));
}

function messageActionUrl(
  ctx: NotificationJobMapperContext,
  payload: Record<string, unknown>,
  recipientId: string,
): string {
  const userFrontend = baseUrl(ctx.frontendUrl);
  const adminFrontend = baseUrl(ctx.adminUrl);
  const isAdmin = isAdminRecipient(recipientId, ctx.adminIds);
  const base = isAdmin ? adminFrontend : userFrontend;
  const projectId = payload.projectId ? String(payload.projectId) : '';
  const threadId = payload.threadId ? String(payload.threadId) : '';
  if (projectId) {
    return isAdmin
      ? appPath(base, `/messages/project/${projectId}`)
      : appPath(base, `/messages/${projectId}`);
  }
  if (threadId) {
    return isAdmin
      ? appPath(base, `/messages/thread/${threadId}`)
      : appPath(base, `/messages/${threadId}`);
  }
  return appPath(base, '/messages');
}

/**
 * Maps RabbitMQ routing keys and legacy outbox payloads to normalized NotificationJob messages.
 * Mirrors {@link mapToEmailJobs} from @nestlancer/email.
 */
export function mapToNotificationJobs(
  routingKey: string | undefined,
  raw: unknown,
  ctx: NotificationJobMapperContext = {},
): NotificationJob[] {
  if (!raw || typeof raw !== 'object') return [];
  if (isNotificationJob(raw)) return [raw];

  const payload = raw as Record<string, unknown>;
  const key = routingKey || '';
  const userFrontend = baseUrl(ctx.frontendUrl);
  const adminFrontend = baseUrl(ctx.adminUrl || ctx.frontendUrl);

  if (key === 'request.request.submitted' || key === 'REQUEST_SUBMITTED') {
    const requestId = String(payload.requestId || '');
    const category = String(payload.category || payload.requestCategory || 'project');
    const submitterName = String(payload.submitterName || payload.clientName || 'A client');
    const requestTitle = String(payload.requestTitle || payload.title || 'New request');
    return adminJobs(ctx.adminIds, (adminId) =>
      buildJob({
        userId: adminId,
        notificationType: NotificationEventType.REQUEST_SUBMITTED,
        title: 'New request submitted',
        message: `${submitterName} submitted "${requestTitle}" (${category}).`,
        actionUrl: requestId
          ? appPath(adminFrontend, `/requests/${requestId}`)
          : appPath(adminFrontend, `/requests`),
        priority: 'HIGH',
        data: { requestId, category, submitterName },
        idempotencyKey: requestId ? `request.submitted:${requestId}:${adminId}` : undefined,
      }),
    );
  }

  if (key === 'request.status.changed' || key === 'REQUEST_STATUS_UPDATED') {
    const userId = String(payload.userId || payload.clientId || '');
    const requestId = String(payload.requestId || '');
    const newStatus = String(payload.newStatus || payload.status || 'updated');
    const statusLabel = humanizeStatusLabel(newStatus);
    const requestTitleRaw = payload.requestTitle ?? payload.title;
    const requestTitle =
      typeof requestTitleRaw === 'string' && requestTitleRaw.trim()
        ? requestTitleRaw.trim()
        : undefined;
    if (!userId) return [];
    return [
      buildJob({
        userId,
        notificationType: NotificationEventType.REQUEST_STATUS_CHANGED,
        title: 'Request status updated',
        message: requestTitle
          ? `Your request "${requestTitle}" is now ${statusLabel}.`
          : `Your request status changed to ${statusLabel}.`,
        actionUrl: requestId ? appPath(userFrontend, `/requests/${requestId}`) : appPath(userFrontend, `/requests`),
        data: {
          requestId,
          newStatus,
          statusLabel,
          oldStatus: payload.oldStatus,
          requestTitle,
        },
        idempotencyKey: requestId
          ? `request.status:${requestId}:${newStatus}:${userId}`
          : undefined,
      }),
    ];
  }

  if (key === 'request.assigned' || key === 'REQUEST_ASSIGNED') {
    const assigneeId = String(payload.assigneeId || '');
    const requestId = String(payload.requestId || '');
    if (!assigneeId) return [];
    return [
      buildJob({
        userId: assigneeId,
        notificationType: NotificationEventType.REQUEST_ASSIGNED,
        title: 'Request assigned to you',
        message: 'A project request has been assigned to you for review.',
        actionUrl: requestId
          ? appPath(adminFrontend, `/requests/${requestId}`)
          : appPath(adminFrontend, `/requests`),
        data: { requestId },
        idempotencyKey: requestId ? `request.assigned:${requestId}:${assigneeId}` : undefined,
      }),
    ];
  }

  if (key === 'quote.quote.sent' || key === 'QUOTE_SENT') {
    const userId = String(payload.userId || payload.clientId || '');
    const quoteId = String(payload.quoteId || payload.aggregateId || '');
    if (!userId) return [];
    const amountLabel = formatAmount(payload.amount ?? payload.totalAmount, payload.currency);
    const projectTitle = String(payload.projectTitle || payload.title || 'your project');
    const amountPart = amountLabel ? ` — ${amountLabel}` : '';
    return [
      buildJob({
        userId,
        notificationType: NotificationEventType.QUOTE_RECEIVED,
        title: 'New quote received',
        message: `You received a quote for ${projectTitle}${amountPart}.`,
        actionUrl: quoteId ? appPath(userFrontend, `/quotes/${quoteId}`) : appPath(userFrontend, `/quotes`),
        priority: 'HIGH',
        data: {
          quoteId,
          projectTitle,
          amount: payload.amount ?? payload.totalAmount,
          currency: payload.currency,
        },
        idempotencyKey: quoteId ? `quote.received:${quoteId}:${userId}` : undefined,
      }),
    ];
  }

  if (
    key === 'quote.quote.revised' ||
    key === 'document.quote.revised' ||
    key === 'QUOTE_REVISION_CREATED'
  ) {
    const userId = String(payload.userId || payload.clientId || '');
    const quoteId = String(payload.quoteId || payload.aggregateId || '');
    if (!userId) return [];
    return [
      buildJob({
        userId,
        notificationType: NotificationEventType.QUOTE_REVISED,
        title: 'Quote revised',
        message: 'Your quote has been updated. Review the latest version.',
        actionUrl: quoteId ? appPath(userFrontend, `/quotes/${quoteId}`) : appPath(userFrontend, `/quotes`),
        priority: 'HIGH',
        data: { quoteId },
        idempotencyKey: quoteId ? `quote.revised:${quoteId}:${userId}` : undefined,
      }),
    ];
  }

  if (key === 'quote.quote.extended' || key === 'QUOTE_EXTENDED') {
    const userId = String(payload.userId || payload.clientId || '');
    const quoteId = String(payload.quoteId || payload.aggregateId || '');
    if (!userId) return [];
    return [
      buildJob({
        userId,
        notificationType: NotificationEventType.QUOTE_REVISED,
        title: 'Quote validity extended',
        message: 'Your quote has been extended. You can review and accept it again.',
        actionUrl: quoteId ? appPath(userFrontend, `/quotes/${quoteId}`) : appPath(userFrontend, `/quotes`),
        priority: 'HIGH',
        data: { quoteId, validUntil: payload.validUntil },
        idempotencyKey: quoteId ? `quote.extended:${quoteId}:${userId}` : undefined,
      }),
    ];
  }

  if (key === 'quote.quote.accepted' || key === 'QUOTE_ACCEPTED') {
    const quoteId = String(payload.quoteId || '');
    const clientName = String(payload.clientName || 'Client');
    const projectTitle = String(payload.projectTitle || 'a project');
    const createdById = payload.createdById ? String(payload.createdById) : undefined;
    const targets = createdById ? [createdById] : ctx.adminIds;
    return adminJobs(targets, (adminId) =>
      buildJob({
        userId: adminId,
        notificationType: NotificationEventType.QUOTE_ACCEPTED,
        title: 'Quote accepted',
        message: `${clientName} accepted the quote for ${projectTitle}.`,
        actionUrl: quoteId ? appPath(adminFrontend, `/quotes/${quoteId}`) : appPath(adminFrontend, `/quotes`),
        priority: 'HIGH',
        data: { quoteId, clientName, projectTitle },
        idempotencyKey: quoteId ? `quote.accepted:${quoteId}:${adminId}` : undefined,
      }),
    );
  }

  if (key === 'quote.quote.declined' || key === 'QUOTE_DECLINED') {
    const quoteId = String(payload.quoteId || '');
    const reason = payload.reason ? String(payload.reason) : undefined;
    return adminJobs(ctx.adminIds, (adminId) =>
      buildJob({
        userId: adminId,
        notificationType: NotificationEventType.QUOTE_DECLINED,
        title: 'Quote declined',
        message: reason ? `A client declined a quote: ${reason}` : 'A client declined a quote.',
        actionUrl: quoteId ? appPath(adminFrontend, `/quotes/${quoteId}`) : appPath(adminFrontend, `/quotes`),
        data: { quoteId, reason },
        idempotencyKey: quoteId ? `quote.declined:${quoteId}:${adminId}` : undefined,
      }),
    );
  }

  if (
    key === 'quote.changes.requested' ||
    key === 'QUOTE_CHANGES_REQUESTED' ||
    key === 'QUOTE_REVISION_REQUESTED'
  ) {
    const quoteId = String(payload.quoteId || '');
    return adminJobs(ctx.adminIds, (adminId) =>
      buildJob({
        userId: adminId,
        notificationType: NotificationEventType.QUOTE_CHANGES_REQUESTED,
        title: 'Quote changes requested',
        message: 'A client requested changes to a quote.',
        actionUrl: quoteId ? appPath(adminFrontend, `/quotes/${quoteId}`) : appPath(adminFrontend, `/quotes`),
        priority: 'HIGH',
        data: { quoteId, changes: payload.changes },
        idempotencyKey: quoteId ? `quote.changes:${quoteId}:${adminId}` : undefined,
      }),
    );
  }

  if (key === 'MANUAL_PAYMENT_CREATED' || (key === 'payment.payment.initiated' && payload.manual)) {
    const userId = String(payload.userId || payload.clientId || '');
    const paymentId = String(payload.paymentId || '');
    if (!userId) return [];
    const amountLabel = formatAmount(payload.amount, payload.currency);
    const projectTitle = payload.projectTitle ? String(payload.projectTitle) : undefined;
    const message =
      amountLabel && projectTitle
        ? `An offline payment of ${amountLabel} for ${projectTitle} was recorded on your account.`
        : amountLabel
          ? `An offline payment of ${amountLabel} was recorded on your account.`
          : 'An offline payment was recorded on your account.';
    return [
      buildJob({
        userId,
        notificationType: NotificationEventType.PAYMENT_MANUAL_RECORDED,
        title: paymentRecordedTitle(amountLabel, projectTitle),
        message,
        actionUrl: paymentId ? appPath(userFrontend, `/payments/${paymentId}`) : appPath(userFrontend, `/payments`),
        priority: 'HIGH',
        data: {
          paymentId,
          amount: payload.amount,
          currency: payload.currency,
          amountLabel: amountLabel || undefined,
          projectId: payload.projectId,
          projectTitle,
        },
        idempotencyKey: paymentId ? `payment.manual:${paymentId}:${userId}` : undefined,
      }),
    ];
  }

  if (key === 'PAYMENT_PENDING_VERIFICATION') {
    const clientId = String(payload.clientId || payload.userId || '');
    const paymentId = String(payload.paymentId || '');
    const amountLabel = formatAmount(payload.amount, payload.currency);
    const jobs: NotificationJob[] = [];
    if (clientId) {
      jobs.push(
        buildJob({
          userId: clientId,
          notificationType: NotificationEventType.PAYMENT_PENDING_VERIFICATION,
          title: 'Transfer submitted',
          message: amountLabel
            ? `Your ${amountLabel} bank/UPI transfer is awaiting admin verification.`
            : 'Your bank/UPI transfer is awaiting admin verification.',
          actionUrl: paymentId
            ? appPath(userFrontend, `/payments/${paymentId}`)
            : appPath(userFrontend, `/payments`),
          priority: 'NORMAL',
          data: {
            paymentId,
            transferReference: payload.transferReference,
            amount: payload.amount,
            currency: payload.currency,
          },
          idempotencyKey: paymentId
            ? `payment.pendingVerification:${paymentId}:${clientId}`
            : undefined,
        }),
      );
    }
    const adminId = String(payload.adminNotifyUserId || '');
    // Fan-out to a dedicated admin inbox is handled by listing PENDING_VERIFICATION;
    // optionally notify a configured admin if provided in payload.
    if (adminId) {
      jobs.push(
        buildJob({
          userId: adminId,
          notificationType: NotificationEventType.PAYMENT_PENDING_VERIFICATION,
          title: 'Offline payment to verify',
          message: amountLabel
            ? `A ${amountLabel} bank/UPI transfer needs verification.`
            : 'A bank/UPI transfer needs verification.',
          actionUrl: paymentId
            ? appPath(adminFrontend, `/payments/${paymentId}`)
            : appPath(adminFrontend, `/payments`),
          priority: 'HIGH',
          data: { paymentId, transferReference: payload.transferReference },
          idempotencyKey: paymentId
            ? `payment.pendingVerification:admin:${paymentId}:${adminId}`
            : undefined,
        }),
      );
    }
    return jobs;
  }

  if (key === 'PAYMENT_TRANSFER_APPROVED') {
    const clientId = String(payload.clientId || payload.userId || '');
    const paymentId = String(payload.paymentId || '');
    if (!clientId) return [];
    const amountLabel = formatAmount(payload.amount, payload.currency);
    return [
      buildJob({
        userId: clientId,
        notificationType: NotificationEventType.PAYMENT_TRANSFER_APPROVED,
        title: 'Transfer verified',
        message: amountLabel
          ? `Your ${amountLabel} bank/UPI transfer was approved.`
          : 'Your bank/UPI transfer was approved.',
        actionUrl: paymentId ? appPath(userFrontend, `/payments/${paymentId}`) : appPath(userFrontend, `/payments`),
        priority: 'HIGH',
        data: { paymentId, amount: payload.amount, currency: payload.currency },
        idempotencyKey: paymentId
          ? `payment.transferApproved:${paymentId}:${clientId}`
          : undefined,
      }),
    ];
  }

  if (key === 'PAYMENT_TRANSFER_REJECTED') {
    const clientId = String(payload.clientId || payload.userId || '');
    const paymentId = String(payload.paymentId || '');
    if (!clientId) return [];
    const reason = payload.reason ? String(payload.reason) : 'Please resubmit with a valid proof.';
    return [
      buildJob({
        userId: clientId,
        notificationType: NotificationEventType.PAYMENT_TRANSFER_REJECTED,
        title: 'Transfer rejected',
        message: `Your bank/UPI transfer was rejected: ${reason}`,
        actionUrl: paymentId ? appPath(userFrontend, `/payments/${paymentId}`) : appPath(userFrontend, `/payments`),
        priority: 'HIGH',
        data: { paymentId, reason },
        idempotencyKey: paymentId
          ? `payment.transferRejected:${paymentId}:${clientId}`
          : undefined,
      }),
    ];
  }

  if (
    key === 'payment.payment.initiated' ||
    key === 'PAYMENT_REQUESTED' ||
    key === 'PAYMENT_REMINDER'
  ) {
    const userId = String(payload.userId || payload.clientId || '');
    const projectId = String(payload.projectId || '');
    const paymentId = String(payload.paymentId || '');
    if (!userId) return [];
    const milestoneName = payload.milestoneName ? String(payload.milestoneName) : undefined;
    const isReminder = key.includes('reminder') || key === 'PAYMENT_REMINDER';
    const amountLabel = formatAmount(payload.amount, payload.currency);
    return [
      buildJob({
        userId,
        notificationType: NotificationEventType.PAYMENT_DUE,
        title: isReminder ? 'Payment reminder' : 'Payment requested',
        message: milestoneName
          ? isReminder
            ? `Reminder: payment for "${milestoneName}" is still outstanding${amountLabel ? ` (${amountLabel})` : ''}.`
            : `Please pay ${milestoneName}${amountLabel ? ` (${amountLabel})` : ''} to continue your project.`
          : isReminder
            ? 'Reminder: you have an outstanding project payment.'
            : 'A milestone payment is due on your project.',
        actionUrl: paymentId
          ? appPath(userFrontend, `/payments/${paymentId}`)
          : projectId
            ? appPath(userFrontend, `/projects/${projectId}`)
            : appPath(userFrontend, `/payments`),
        priority: 'HIGH',
        data: {
          projectId,
          paymentId,
          milestoneName,
          amount: payload.amount,
          currency: payload.currency,
          amountLabel: amountLabel || undefined,
          projectTitle: payload.projectTitle ? String(payload.projectTitle) : undefined,
        },
        idempotencyKey:
          paymentId && isReminder
            ? `payment.reminder:${paymentId}:${userId}`
            : paymentId
              ? `payment.due:${paymentId}:${userId}`
              : undefined,
      }),
    ];
  }

  if (
    key === 'payment.payment.completed' ||
    key === 'PAYMENT_COMPLETED' ||
    key === 'MILESTONE_PAYMENT_RELEASED'
  ) {
    const clientId = String(payload.userId || payload.clientId || '');
    const paymentId = String(payload.paymentId || '');
    const amountLabel = formatAmount(payload.amount, payload.currency);
    const jobs: NotificationJob[] = [];

    if (clientId) {
      const projectTitleRaw = payload.projectTitle ?? payload.projectName;
      const projectTitle =
        typeof projectTitleRaw === 'string' && projectTitleRaw.trim()
          ? projectTitleRaw.trim()
          : undefined;
      const milestoneNameRaw = payload.milestoneName;
      const milestoneName =
        typeof milestoneNameRaw === 'string' && milestoneNameRaw.trim()
          ? milestoneNameRaw.trim()
          : undefined;
      const paymentMessage = (() => {
        if (amountLabel && projectTitle && milestoneName) {
          return `Your payment of ${amountLabel} for ${milestoneName} on ${projectTitle} was received.`;
        }
        if (amountLabel && projectTitle) {
          return `Your payment of ${amountLabel} for ${projectTitle} was received.`;
        }
        if (amountLabel) {
          return `Your payment of ${amountLabel} was received.`;
        }
        if (projectTitle) {
          return `Your payment for ${projectTitle} was received.`;
        }
        return 'Your payment was received successfully.';
      })();
      jobs.push(
        buildJob({
          userId: clientId,
          notificationType: NotificationEventType.PAYMENT_RECEIVED,
          title: 'Payment received',
          message: paymentMessage,
          actionUrl: paymentId
            ? appPath(userFrontend, `/payments/${paymentId}`)
            : appPath(userFrontend, `/payments`),
          priority: 'HIGH',
          data: {
            paymentId,
            amount: payload.amount,
            currency: payload.currency,
            amountLabel: amountLabel || undefined,
            projectTitle,
            milestoneName,
          },
          idempotencyKey: paymentId
            ? `payment.received:client:${paymentId}:${clientId}`
            : undefined,
        }),
      );
    }

    jobs.push(
      ...adminJobs(ctx.adminIds, (adminId) =>
        buildJob({
          userId: adminId,
          notificationType: NotificationEventType.PAYMENT_RECEIVED,
          title: paymentRecordedTitle(amountLabel, typeof payload.projectTitle === 'string' ? payload.projectTitle : undefined),
          message: amountLabel && payload.projectTitle
            ? `Payment of ${amountLabel} was recorded for ${payload.projectTitle}.`
            : amountLabel
            ? `Payment of ${amountLabel} was recorded.`
            : 'A project payment was recorded.',
          actionUrl: paymentId ? appPath(adminFrontend, `/payments`) : appPath(adminFrontend, `/payments`),
          priority: 'HIGH',
          data: { paymentId, amount: payload.amount, currency: payload.currency, clientId, amountLabel: amountLabel || undefined, projectTitle: payload.projectTitle },
          idempotencyKey: paymentId ? `payment.received:admin:${paymentId}:${adminId}` : undefined,
        }),
      ),
    );

    return jobs;
  }

  if (key === 'payment.payment.failed' || key === 'notification.payment.failed') {
    const userId = String(payload.userId || payload.clientId || '');
    const paymentId = String(payload.paymentId || '');
    if (!userId) return [];
    return [
      buildJob({
        userId,
        notificationType: NotificationEventType.PAYMENT_FAILED,
        title: 'Payment failed',
        message: 'Your payment could not be processed. Please try again or use another method.',
        actionUrl: paymentId ? appPath(userFrontend, `/payments/${paymentId}`) : appPath(userFrontend, `/payments`),
        priority: 'CRITICAL',
        data: { paymentId },
        idempotencyKey: paymentId ? `payment.failed:${paymentId}:${userId}` : undefined,
      }),
    ];
  }

  if (key === 'project.status.changed' || key === 'PROJECT_STATUS_CHANGED') {
    if (payload.notifyClient === false) return [];
    const userId = String(payload.userId || payload.clientId || '');
    const projectId = String(payload.projectId || '');
    const status = String(payload.status || payload.newStatus || 'updated');
    const statusLabel = humanizeStatusLabel(status);
    const projectTitleRaw = payload.projectTitle ?? payload.projectName;
    const projectTitle =
      typeof projectTitleRaw === 'string' && projectTitleRaw.trim()
        ? projectTitleRaw.trim()
        : undefined;
    const amountLabel = formatAmount(payload.amount ?? payload.totalAmount, payload.currency);
    if (!userId) return [];
    const amountPart = amountLabel ? ` (${amountLabel})` : '';
    return [
      buildJob({
        userId,
        notificationType: NotificationEventType.PROJECT_STATUS_CHANGED,
        title: 'Project status updated',
        message: projectTitle
          ? `${projectTitle} status changed to ${statusLabel}${amountPart}.`
          : `Your project status changed to ${statusLabel}${amountPart}.`,
        actionUrl: projectId ? appPath(userFrontend, `/projects/${projectId}`) : appPath(userFrontend, `/projects`),
        data: {
          projectId,
          status,
          newStatus: status,
          statusLabel,
          projectTitle,
          amount: payload.amount ?? payload.totalAmount,
          currency: payload.currency,
          amountLabel: amountLabel || undefined,
        },
        idempotencyKey: projectId ? `project.status:${projectId}:${status}:${userId}` : undefined,
      }),
    ];
  }

  if (key === 'project.project.resumed' || key === 'PROJECT_RESUMED') {
    const userId = String(payload.userId || payload.clientId || '');
    const projectId = String(payload.projectId || '');
    if (!userId) return [];
    return [
      buildJob({
        userId,
        notificationType: NotificationEventType.PROJECT_STATUS_CHANGED,
        title: 'Project work resumed',
        message: 'Your payment was received and project work has resumed.',
        actionUrl: projectId ? appPath(userFrontend, `/projects/${projectId}`) : appPath(userFrontend, `/projects`),
        data: { projectId, status: 'IN_PROGRESS' },
        idempotencyKey: projectId ? `project.resumed:${projectId}:${userId}` : undefined,
      }),
    ];
  }

  if (key === 'project.project.suspended' || key === 'PROJECT_SUSPENDED') {
    const userId = String(payload.userId || payload.clientId || '');
    const projectId = String(payload.projectId || '');
    if (!userId) return [];
    return [
      buildJob({
        userId,
        notificationType: NotificationEventType.PROJECT_STATUS_CHANGED,
        title: 'Project suspended',
        message: 'Your project was suspended due to overdue payment. Please pay to resume work.',
        actionUrl: projectId ? appPath(userFrontend, `/projects/${projectId}`) : appPath(userFrontend, `/projects`),
        priority: 'HIGH',
        data: { projectId, status: 'SUSPENDED', reason: payload.reason },
        idempotencyKey: projectId ? `project.suspended:${projectId}:${userId}` : undefined,
      }),
    ];
  }

  if (key === 'project.project.completed' || key === 'PROJECT_COMPLETED') {
    const userId = String(payload.userId || payload.clientId || '');
    const projectId = String(payload.projectId || '');
    const projectTitle = String(payload.projectTitle || payload.projectName || 'your project');
    if (!userId) return [];
    return [
      buildJob({
        userId,
        notificationType: NotificationEventType.PROJECT_COMPLETED,
        title: 'Project completed',
        message: `${projectTitle} has been marked complete.`,
        actionUrl: projectId ? appPath(userFrontend, `/projects/${projectId}`) : appPath(userFrontend, `/projects`),
        priority: 'HIGH',
        data: { projectId, projectTitle },
        idempotencyKey: projectId ? `project.completed:${projectId}:${userId}` : undefined,
      }),
    ];
  }

  if (key === 'message.message.sent' || key === 'MESSAGE_SENT') {
    const senderId = String(payload.senderId || '');
    const messageId = String(payload.messageId || '');
    const projectTitleRaw = payload.projectTitle ?? payload.projectName;
    const projectTitle =
      typeof projectTitleRaw === 'string' && projectTitleRaw.trim()
        ? projectTitleRaw.trim()
        : undefined;
    const threadId = payload.threadId ? String(payload.threadId) : undefined;
    const projectId = payload.projectId ? String(payload.projectId) : undefined;

    const buildMessageJob = (recipientId: string): NotificationJob | null => {
      if (!recipientId || (senderId && recipientId === senderId)) return null;
      const idKey = messageId || threadId || projectId;
      const senderNameRaw = payload.senderName;
      const senderName =
        typeof senderNameRaw === 'string' && senderNameRaw.trim()
          ? senderNameRaw.trim()
          : undefined;
      const conversationLabelRaw =
        payload.conversationLabel ?? payload.projectTitle ?? payload.projectName;
      const conversationLabel =
        typeof conversationLabelRaw === 'string' && conversationLabelRaw.trim()
          ? conversationLabelRaw.trim()
          : undefined;
      const previewRaw = payload.messagePreview ?? payload.contentPreview;
      const messagePreview =
        typeof previewRaw === 'string' && previewRaw.trim()
          ? previewRaw.trim()
          : undefined;

      let message: string;
      if (senderName && conversationLabel && messagePreview) {
        message = `${senderName} sent a message in ${conversationLabel}: "${messagePreview}"`;
      } else if (senderName && conversationLabel) {
        message = `${senderName} sent a message in ${conversationLabel}.`;
      } else if (senderName && messagePreview) {
        message = `${senderName} sent you a message: "${messagePreview}"`;
      } else if (senderName) {
        message = `${senderName} sent you a message.`;
      } else if (conversationLabel) {
        message = `You have a new message in ${conversationLabel}.`;
      } else {
        message = 'You have a new message.';
      }

      return buildJob({
        userId: recipientId,
        notificationType: NotificationEventType.MESSAGE_NEW,
        title: conversationLabel ? `New message in ${conversationLabel}` : 'New message',
        message,
        actionUrl: messageActionUrl(ctx, payload, recipientId),
        data: {
          threadId,
          projectId,
          senderId,
          senderName,
          projectTitle,
          conversationLabel,
          messagePreview,
          messageId,
        },
        idempotencyKey: idKey ? `message.new:${idKey}:${recipientId}` : undefined,
      });
    };

    if (payload.notifyAllAdmins) {
      return adminJobs(ctx.adminIds, (adminId) => buildMessageJob(adminId));
    }

    const recipientIds = Array.isArray(payload.recipientIds)
      ? (payload.recipientIds as unknown[]).map(String).filter(Boolean)
      : [];
    if (recipientIds.length > 0) {
      const jobs: NotificationJob[] = [];
      for (const recipientId of recipientIds) {
        const job = buildMessageJob(recipientId);
        if (job) jobs.push(job);
      }
      return jobs;
    }

    const recipientId = String(payload.recipientId || '');
    const job = buildMessageJob(recipientId);
    return job ? [job] : [];
  }

  if (key === 'message.message.mentioned' || key === 'MESSAGE_MENTIONED') {
    const recipientId = String(payload.recipientId || '');
    const senderId = String(payload.senderId || '');
    const messageId = String(payload.messageId || '');
    const threadId = payload.threadId ? String(payload.threadId) : undefined;
    const projectId = payload.projectId ? String(payload.projectId) : undefined;
    if (!recipientId || recipientId === senderId) return [];
    const senderNameRaw = payload.senderName;
    const senderName =
      typeof senderNameRaw === 'string' && senderNameRaw.trim()
        ? senderNameRaw.trim()
        : undefined;
    const conversationLabelRaw =
      payload.conversationLabel ?? payload.projectTitle ?? payload.projectName;
    const conversationLabel =
      typeof conversationLabelRaw === 'string' && conversationLabelRaw.trim()
        ? conversationLabelRaw.trim()
        : undefined;
    const previewRaw = payload.messagePreview ?? payload.contentPreview;
    const messagePreview =
      typeof previewRaw === 'string' && previewRaw.trim() ? previewRaw.trim() : undefined;

    let message: string;
    if (senderName && conversationLabel && messagePreview) {
      message = `${senderName} mentioned you in ${conversationLabel}: "${messagePreview}"`;
    } else if (senderName && conversationLabel) {
      message = `${senderName} mentioned you in ${conversationLabel}.`;
    } else if (senderName && messagePreview) {
      message = `${senderName} mentioned you: "${messagePreview}"`;
    } else if (senderName) {
      message = `${senderName} mentioned you in a conversation.`;
    } else if (conversationLabel) {
      message = `You were mentioned in ${conversationLabel}.`;
    } else {
      message = 'You were mentioned in a conversation.';
    }

    return [
      buildJob({
        userId: recipientId,
        notificationType: NotificationEventType.MESSAGE_MENTIONED,
        title: 'You were mentioned',
        message,
        actionUrl: messageActionUrl(ctx, payload, recipientId),
        data: {
          threadId,
          projectId,
          senderId,
          senderName,
          conversationLabel,
          messagePreview,
          messageId,
        },
        idempotencyKey: messageId ? `message.mentioned:${messageId}:${recipientId}` : undefined,
      }),
    ];
  }

  if (key === 'message.group.member_added' || key === 'GROUP_MEMBER_ADDED') {
    const recipientId = String(payload.recipientId || '');
    const threadId = String(payload.threadId || '');
    const threadTitle = String(payload.threadTitle || 'Group conversation');
    if (!recipientId || !threadId) return [];
    return [
      buildJob({
        userId: recipientId,
        notificationType: NotificationEventType.MESSAGE_GROUP_ADDED,
        title: 'Added to group chat',
        message: `You were added to "${threadTitle}".`,
        actionUrl: messageActionUrl(ctx, { threadId }, recipientId),
        data: { threadId, threadTitle },
        idempotencyKey: `group.added:${threadId}:${recipientId}`,
      }),
    ];
  }

  if (key === 'message.message.flagged' || key === 'MESSAGE_FLAGGED') {
    const messageId = String(payload.messageId || '');
    return adminJobs(ctx.adminIds, (adminId) =>
      buildJob({
        userId: adminId,
        notificationType: NotificationEventType.MESSAGE_FLAGGED,
        title: 'Message flagged for review',
        message: 'A message was flagged and needs moderation.',
        actionUrl: appPath(adminFrontend, `/messages/flagged`),
        priority: 'HIGH',
        data: {
          messageId,
          projectId: payload.projectId,
          threadId: payload.threadId,
          senderId: payload.senderId,
        },
        idempotencyKey: messageId ? `message.flagged:${messageId}:${adminId}` : undefined,
      }),
    );
  }

  if (key === 'progress.revision.requested' || key === 'MILESTONE_REVISION_REQUESTED') {
    const projectId = String(payload.projectId || '');
    const milestoneName = String(payload.milestoneName || payload.name || 'Milestone');
    const reason = payload.reason ? String(payload.reason) : undefined;
    return adminJobs(ctx.adminIds, (adminId) =>
      buildJob({
        userId: adminId,
        notificationType: NotificationEventType.REVISION_REQUESTED,
        title: 'Milestone revision requested',
        message: reason
          ? `A client requested revisions on ${milestoneName}: ${reason}`
          : `A client requested revisions on ${milestoneName}.`,
        actionUrl: projectId
          ? appPath(adminFrontend, `/projects/${projectId}`)
          : appPath(adminFrontend, `/projects`),
        priority: 'HIGH',
        data: { projectId, milestoneName, milestoneId: payload.milestoneId },
        idempotencyKey: payload.milestoneId
          ? `revision.requested:${String(payload.milestoneId)}:${adminId}`
          : undefined,
      }),
    );
  }

  if (
    key === 'progress.milestone.completed' ||
    key === 'MILESTONE_COMPLETED' ||
    key === 'progress.milestone.approved' ||
    key === 'MILESTONE_APPROVED'
  ) {
    const userId = String(payload.userId || payload.clientId || '');
    const projectId = String(payload.projectId || '');
    const milestoneName = String(payload.milestoneName || payload.name || 'Milestone');
    const projectTitleRaw = payload.projectTitle ?? payload.projectName;
    const projectTitle =
      typeof projectTitleRaw === 'string' && projectTitleRaw.trim()
        ? projectTitleRaw.trim()
        : undefined;
    if (!userId) return [];
    const isApproved = key.includes('approved') || key === 'MILESTONE_APPROVED';
    const wasRevision = payload.wasRevision === true;
    const deemedAccept = payload.deemedAccept === true;
    if (isApproved && deemedAccept) {
      return [
        buildJob({
          userId,
          notificationType: NotificationEventType.MILESTONE_DEEMED_APPROVED,
          title: 'Milestone auto-approved',
          message: `${milestoneName} was automatically approved after the review period ended.`,
          actionUrl: projectId
            ? appPath(userFrontend, `/projects/${projectId}?tab=milestones`)
            : appPath(userFrontend, `/projects`),
          data: { projectId, milestoneName, milestoneId: payload.milestoneId },
          idempotencyKey: payload.milestoneId
            ? `milestone.deemedApproved:${String(payload.milestoneId)}:${userId}`
            : undefined,
        }),
      ];
    }
    if (wasRevision && !isApproved) {
      return [
        buildJob({
          userId,
          notificationType: NotificationEventType.REVISION_COMPLETED,
          title: 'Revision submitted',
          message: `Updated work for ${milestoneName} is ready for your review.`,
          actionUrl: projectId
            ? appPath(userFrontend, `/projects/${projectId}?tab=milestones`)
            : appPath(userFrontend, `/projects`),
          priority: 'HIGH',
          data: { projectId, milestoneName, milestoneId: payload.milestoneId },
          idempotencyKey: payload.milestoneId
            ? `revision.completed:${String(payload.milestoneId)}:${userId}`
            : undefined,
        }),
      ];
    }
    return [
      buildJob({
        userId,
        notificationType: NotificationEventType.MILESTONE_COMPLETED,
        title: isApproved ? 'Milestone approved' : 'Milestone completed',
        message: isApproved
          ? projectTitle
            ? `${milestoneName} on ${projectTitle} was approved.`
            : `${milestoneName} was approved.`
          : projectTitle
            ? `${milestoneName} on ${projectTitle} has been completed.`
            : `${milestoneName} has been completed.`,
        actionUrl: projectId
          ? appPath(userFrontend, `/projects/${projectId}?tab=milestones`)
          : appPath(userFrontend, `/projects`),
        priority: 'HIGH',
        data: {
          projectId,
          milestoneName,
          projectTitle,
          milestoneId: payload.milestoneId,
        },
        idempotencyKey: projectId
          ? `milestone:${isApproved ? 'approved' : 'completed'}:${projectId}:${milestoneName}:${userId}`
          : undefined,
      }),
    ];
  }

  if (key === 'payment.dispute.opened' || key === 'PAYMENT_DISPUTED') {
    const paymentId = String(payload.paymentId || '');
    const reason = payload.reason ? String(payload.reason) : undefined;
    return adminJobs(ctx.adminIds, (adminId) =>
      buildJob({
        userId: adminId,
        notificationType: NotificationEventType.PAYMENT_DISPUTE_OPENED,
        title: 'Payment dispute opened',
        message: reason
          ? `A client filed a payment dispute: ${reason}`
          : 'A client filed a payment dispute.',
        actionUrl: appPath(adminFrontend, `/payments`),
        priority: 'CRITICAL',
        data: { paymentId, reason, disputeId: payload.disputeId },
        idempotencyKey: paymentId ? `payment.dispute.opened:${paymentId}:${adminId}` : undefined,
      }),
    );
  }

  if (key === 'payment.dispute.resolved' || key === 'PAYMENT_DISPUTE_RESOLVED') {
    const userId = String(payload.userId || payload.clientId || '');
    const paymentId = String(payload.paymentId || '');
    if (!userId) return [];
    return [
      buildJob({
        userId,
        notificationType: NotificationEventType.PAYMENT_DISPUTE_RESOLVED,
        title: 'Payment dispute resolved',
        message: 'Your payment dispute has been reviewed and resolved.',
        actionUrl: paymentId ? appPath(userFrontend, `/payments/${paymentId}`) : appPath(userFrontend, `/payments`),
        priority: 'HIGH',
        data: { paymentId, action: payload.action },
        idempotencyKey: paymentId ? `payment.dispute.resolved:${paymentId}:${userId}` : undefined,
      }),
    ];
  }

  if (key === 'payment.payment.refunded' || key === 'PAYMENT_REFUNDED') {
    const userId = String(payload.userId || payload.clientId || '');
    const paymentId = String(payload.paymentId || '');
    if (!userId) return [];
    const amountLabel = formatAmount(payload.amount, payload.currency);
    return [
      buildJob({
        userId,
        notificationType: NotificationEventType.PAYMENT_REFUNDED,
        title: 'Payment refunded',
        message: amountLabel
          ? `A refund of ${amountLabel} was processed.`
          : 'A refund was processed on your payment.',
        actionUrl: paymentId ? appPath(userFrontend, `/payments/${paymentId}`) : appPath(userFrontend, `/payments`),
        data: {
          paymentId,
          amount: payload.amount,
          currency: payload.currency,
          amountLabel: amountLabel || undefined,
          reason: payload.reason,
          projectTitle: payload.projectTitle ? String(payload.projectTitle) : undefined,
        },
        idempotencyKey: paymentId ? `payment.refunded:${paymentId}:${userId}` : undefined,
      }),
    ];
  }

  if (
    key === 'project.project.created' ||
    key === 'PROJECT_CREATED' ||
    key === 'PROJECT_APPROVED'
  ) {
    const userId = String(payload.userId || payload.clientId || '');
    const projectId = String(payload.projectId || '');
    const projectTitle = String(payload.projectTitle || payload.title || 'your project');
    if (!userId) return [];
    return [
      buildJob({
        userId,
        notificationType: NotificationEventType.PROJECT_CREATED,
        title: 'Project created',
        message: `${projectTitle} is now active.`,
        actionUrl: projectId ? appPath(userFrontend, `/projects/${projectId}`) : appPath(userFrontend, `/projects`),
        data: { projectId, projectTitle },
        idempotencyKey: projectId ? `project.created:${projectId}:${userId}` : undefined,
      }),
    ];
  }

  if (key === 'project.deadline.extended' || key === 'PROJECT_DEADLINE_EXTENDED') {
    const userId = String(payload.userId || payload.clientId || '');
    const projectId = String(payload.projectId || '');
    const projectTitle = String(payload.projectTitle || 'your project');
    if (!userId) return [];
    return [
      buildJob({
        userId,
        notificationType: NotificationEventType.PROJECT_DEADLINE_EXTENDED,
        title: 'Project deadline extended',
        message: `The deadline for ${projectTitle} has been extended.`,
        actionUrl: projectId ? appPath(userFrontend, `/projects/${projectId}`) : appPath(userFrontend, `/projects`),
        data: { projectId, newDeadline: payload.newDeadline },
        idempotencyKey: projectId ? `project.deadline:${projectId}:${userId}` : undefined,
      }),
    ];
  }

  if (key === 'project.revision.requested' || key === 'PROJECT_REVISION_REQUESTED') {
    const projectId = String(payload.projectId || '');
    return adminJobs(ctx.adminIds, (adminId) =>
      buildJob({
        userId: adminId,
        notificationType: NotificationEventType.PROJECT_REVISION_REQUESTED,
        title: 'Project revision requested',
        message: 'A client requested changes on a project.',
        actionUrl: projectId
          ? appPath(adminFrontend, `/projects/${projectId}`)
          : appPath(adminFrontend, `/projects`),
        priority: 'HIGH',
        data: { projectId },
        idempotencyKey: projectId ? `project.revision:${projectId}:${adminId}` : undefined,
      }),
    );
  }

  if (key === 'project.duplication.requested' || key === 'PROJECT_DUPLICATION_REQUESTED') {
    const adminId = String(payload.requestedByUserId || payload.requestedBy || '');
    const projectId = String(payload.projectId || '');
    const targets = adminId ? [adminId] : ctx.adminIds;
    return adminJobs(targets, (userId) =>
      buildJob({
        userId,
        notificationType: NotificationEventType.PROJECT_DUPLICATION_READY,
        title: 'Project duplication queued',
        message: 'A project duplication job has been queued.',
        actionUrl: projectId
          ? appPath(adminFrontend, `/projects/${projectId}`)
          : appPath(adminFrontend, `/projects`),
        data: { projectId, jobId: payload.jobId },
        idempotencyKey: payload.jobId
          ? `project.duplication.queued:${String(payload.jobId)}:${userId}`
          : undefined,
      }),
    );
  }

  if (key === 'project.duplication.completed' || key === 'PROJECT_DUPLICATION_COMPLETED') {
    const adminId = String(payload.requestedByUserId || payload.requestedBy || '');
    const projectId = String(payload.newProjectId || payload.projectId || '');
    const targets = adminId ? [adminId] : ctx.adminIds;
    return adminJobs(targets, (userId) =>
      buildJob({
        userId,
        notificationType: NotificationEventType.PROJECT_DUPLICATION_READY,
        title: 'Project duplication complete',
        message: 'Your duplicated project is ready to open.',
        actionUrl: projectId
          ? appPath(adminFrontend, `/projects/${projectId}`)
          : appPath(adminFrontend, `/projects`),
        priority: 'HIGH',
        data: { projectId, jobId: payload.jobId },
        idempotencyKey: payload.jobId
          ? `project.duplication.done:${String(payload.jobId)}:${userId}`
          : undefined,
      }),
    );
  }

  if (key === 'export.job.completed' || key === 'EXPORT_COMPLETED') {
    const exportType = String(payload.exportType || 'export');
    const title = String(payload.title || 'Your export is ready');
    const isUserExport = exportType === 'gdpr';
    const recipientId = isUserExport
      ? String(payload.userId || payload.requestedByUserId || '')
      : String(payload.requestedByUserId || '');
    const projectId = payload.projectId ? String(payload.projectId) : undefined;
    const exportId = payload.exportId ? String(payload.exportId) : undefined;

    if (isUserExport && recipientId) {
      return [
        buildJob({
          userId: recipientId,
          notificationType: NotificationEventType.EXPORT_READY,
          title,
          message: 'Your requested data export is ready to download.',
          actionUrl: exportId
            ? appPath(userFrontend, `/settings/account?downloadExport=${encodeURIComponent(exportId)}`)
            : appPath(userFrontend, `/settings/account`),
          priority: 'HIGH',
          data: {
            exportType,
            documentId: payload.documentId,
            exportId: payload.exportId,
          },
          idempotencyKey: exportId
            ? `export.ready:${exportType}:${exportId}:${recipientId}`
            : undefined,
        }),
      ];
    }

    const adminExportActionUrl = (() => {
      if (exportType === 'project' && projectId) {
        return appPath(adminFrontend, `/projects/${projectId}?downloadExport=1`);
      }
      if (exportId) {
        return appPath(adminFrontend, `/system?downloadExport=${encodeURIComponent(exportId)}&exportType=${encodeURIComponent(exportType)}`);
      }
      return appPath(adminFrontend, `/system`);
    })();

    return adminJobs(recipientId ? [recipientId] : ctx.adminIds, (adminId) =>
      buildJob({
        userId: adminId,
        notificationType: NotificationEventType.EXPORT_READY,
        title,
        message: `Your ${exportType} export is ready to download.`,
        actionUrl: adminExportActionUrl,
        priority: 'HIGH',
        data: {
          exportType,
          documentId: payload.documentId,
          exportId: payload.exportId,
          projectId: payload.projectId,
        },
        idempotencyKey: exportId ? `export.ready:${exportType}:${exportId}:${adminId}` : undefined,
      }),
    );
  }

  if (key === 'document.generation.ready' || key === 'DOCUMENT_READY') {
    const userId = String(payload.userId || '');
    if (!userId) return [];
    const documentType = String(payload.documentType || '').toLowerCase();
    const documentTypeLabel = humanizeStatusLabel(documentType || 'document');
    const entityId = payload.entityId ? String(payload.entityId) : undefined;
    const paymentId = payload.paymentId ? String(payload.paymentId) : undefined;
    const projectId = payload.projectId ? String(payload.projectId) : undefined;
    const quoteId = payload.quoteId ? String(payload.quoteId) : undefined;
    const docTitleRaw = payload.title ?? payload.documentNumber ?? payload.documentTitle;
    // Strip trailing "ready" so message grammar stays clean (NL-NOTIF-002).
    const docTitle =
      typeof docTitleRaw === 'string' && docTitleRaw.trim()
        ? docTitleRaw
            .trim()
            .replace(/\s+ready$/i, '')
            .replace(/[.!]+$/g, '')
            .trim() || `${documentTypeLabel}`
        : documentTypeLabel;
    const projectTitleRaw = payload.projectTitle ?? payload.projectName;
    const projectTitle =
      typeof projectTitleRaw === 'string' && projectTitleRaw.trim()
        ? projectTitleRaw.trim()
        : undefined;
    const documentNumberRaw = payload.documentNumber;
    const documentNumber =
      typeof documentNumberRaw === 'string' && documentNumberRaw.trim()
        ? documentNumberRaw.trim()
        : undefined;
    const docLabel = documentNumber ? `${docTitle} (${documentNumber})` : docTitle;
    const amountLabel = formatAmount(payload.amount, payload.currency);
    const amountSuffix = amountLabel ? ` (${amountLabel})` : '';

    const actionUrl = (() => {
      if (documentType.includes('invoice') && (paymentId || entityId)) {
        return appPath(userFrontend, `/payments/invoice/${paymentId || entityId}`);
      }
      if (documentType.includes('receipt') && (paymentId || entityId)) {
        return appPath(userFrontend, `/payments/${paymentId || entityId}`);
      }
      if (documentType.includes('quote') && (quoteId || entityId)) {
        return appPath(userFrontend, `/quotes/${quoteId || entityId}`);
      }
      if (projectId) {
        return appPath(userFrontend, `/projects/${projectId}`);
      }
      return appPath(userFrontend, `/dashboard`);
    })();

    return [
      buildJob({
        userId,
        notificationType: NotificationEventType.DOCUMENT_READY,
        title: docTitle,
        message: projectTitle
          ? `Your ${docLabel} for ${projectTitle}${amountSuffix} is ready to download.`
          : `Your ${docLabel}${amountSuffix} is ready to download.`,
        actionUrl,
        data: {
          documentId: payload.documentId,
          documentType: payload.documentType,
          documentTypeLabel,
          documentTitle: docTitle,
          documentNumber,
          title: docTitle,
          entityId: payload.entityId,
          paymentId: payload.paymentId,
          projectId: payload.projectId,
          projectTitle,
          quoteId: payload.quoteId,
          amount: payload.amount,
          currency: payload.currency,
          amountLabel: amountLabel || undefined,
        },
        idempotencyKey: payload.documentId
          ? `document.ready:${String(payload.documentId)}:${userId}`
          : undefined,
      }),
    ];
  }

  if (
    key === 'progress.deliverable.uploaded' ||
    key === 'DELIVERABLE_UPLOADED' ||
    key === 'progress.deliverable.approved' ||
    key === 'DELIVERABLE_APPROVED'
  ) {
    const userId = String(payload.userId || '');
    const projectId = String(payload.projectId || '');
    const projectTitle = String(payload.projectTitle || 'your project');
    const deliverableNameRaw = payload.name ?? payload.deliverableName;
    const deliverableName =
      typeof deliverableNameRaw === 'string' &&
      deliverableNameRaw.trim() &&
      !/^deliverable(\s+upload)?$/i.test(deliverableNameRaw.trim())
        ? deliverableNameRaw.trim().replace(/[.!?]+$/g, '').trim() || 'A new deliverable'
        : 'A new deliverable';
    const isApproved = key.includes('approved') || key === 'DELIVERABLE_APPROVED';
    if (!userId) return [];
    return [
      buildJob({
        userId,
        notificationType: NotificationEventType.DELIVERABLE_READY,
        title: isApproved ? 'Deliverable approved' : 'New deliverable ready',
        message: isApproved
          ? `${deliverableName} on ${projectTitle} has been approved.`
          : `A new deliverable on ${projectTitle} is ready for review: ${deliverableName}.`,
        actionUrl: projectId
          ? appPath(userFrontend, `/projects/${projectId}?tab=deliverables`)
          : appPath(userFrontend, `/projects`),
        priority: 'HIGH',
        data: {
          projectId,
          deliverableId: payload.deliverableId,
          name: payload.name,
          deliverableName,
          projectTitle,
        },
        idempotencyKey: payload.deliverableId
          ? `deliverable.${isApproved ? 'approved' : 'ready'}:${String(payload.deliverableId)}:${userId}`
          : undefined,
      }),
    ];
  }

  if (key === 'progress.entry.created' || key === 'PROGRESS_ENTRY_CREATED') {
    const userId = String(payload.userId || '');
    const projectId = String(payload.projectId || '');
    const projectTitle = String(payload.projectTitle || 'your project');
    const entryTitle = String(payload.title || payload.entryTitle || 'Project update');
    if (!userId) return [];
    return [
      buildJob({
        userId,
        notificationType: NotificationEventType.PROGRESS_ENTRY_CREATED,
        title: 'Project progress update',
        // NL-NOTIF-001: include project + progress title (template may override with same vars).
        message: `New update on ${projectTitle}: ${entryTitle}`,
        actionUrl: projectId ? appPath(userFrontend, `/projects/${projectId}`) : appPath(userFrontend, `/projects`),
        data: {
          projectId,
          entryType: payload.entryType,
          title: entryTitle,
          entryTitle,
          projectTitle,
        },
        idempotencyKey: projectId
          ? `progress.entry:${projectId}:${entryTitle}:${userId}`
          : undefined,
      }),
    ];
  }

  if (key === 'project.feedback.submitted' || key === 'PROJECT_FEEDBACK_SUBMITTED') {
    const projectId = String(payload.projectId || '');
    const title = String(payload.title || 'Project feedback');
    return adminJobs(ctx.adminIds, (adminId) =>
      buildJob({
        userId: adminId,
        notificationType: NotificationEventType.FEEDBACK_SUBMITTED,
        title: 'New project feedback',
        message: `A client submitted feedback: ${title}`,
        actionUrl: projectId
          ? appPath(adminFrontend, `/projects/${projectId}`)
          : appPath(adminFrontend, `/projects`),
        priority: 'HIGH',
        data: { projectId, feedbackId: payload.feedbackId },
        idempotencyKey: payload.feedbackId
          ? `feedback.submitted:${String(payload.feedbackId)}:${adminId}`
          : undefined,
      }),
    );
  }

  if (
    key === 'contact.inquiry.received' ||
    key === 'contact.message.received' ||
    key === 'CONTACT_INQUIRY_RECEIVED'
  ) {
    const submitter = payload.name ? String(payload.name) : 'Someone';
    const subject = payload.subject ? String(payload.subject) : 'General inquiry';
    return adminJobs(ctx.adminIds, (adminId) =>
      buildJob({
        userId: adminId,
        notificationType: NotificationEventType.CONTACT_INQUIRY,
        title: 'New contact inquiry',
        message: `${submitter} submitted an inquiry about ${subject}.`,
        actionUrl: appPath(adminFrontend, `/contact`),
        priority: 'HIGH',
        data: { contactId: payload.contactId, ticketId: payload.ticketId },
        idempotencyKey: payload.ticketId
          ? `contact.inquiry:${String(payload.ticketId)}:${adminId}`
          : undefined,
      }),
    );
  }

  if (key === 'contact.response.sent' || key === 'CONTACT_RESPONSE_SENT') {
    const userId = String(payload.userId || '');
    if (!userId) return [];
    const ticketId = payload.ticketId ? String(payload.ticketId) : undefined;
    return [
      buildJob({
        userId,
        notificationType: NotificationEventType.CONTACT_REPLIED,
        title: 'Reply to your inquiry',
        message: ticketId
          ? `We replied to your contact request (${ticketId}).`
          : 'We replied to your contact request.',
        actionUrl: appPath(userFrontend, `/contact`),
        priority: 'HIGH',
        data: { contactId: payload.contactId, ticketId },
        idempotencyKey: payload.contactId
          ? `contact.replied:${String(payload.contactId)}:${userId}`
          : undefined,
      }),
    ];
  }

  if (key === 'blog.comment.created' || key === 'BLOG_COMMENT_CREATED') {
    if (payload.status !== 'PENDING') return [];
    const postTitle = payload.postTitle ? String(payload.postTitle) : 'a blog post';
    const commentId = String(payload.commentId || '');
    return adminJobs(ctx.adminIds, (adminId) =>
      buildJob({
        userId: adminId,
        notificationType: NotificationEventType.COMMENT_PENDING,
        title: 'Comment awaiting moderation',
        message: `A new comment on ${postTitle} needs review.`,
        actionUrl: appPath(adminFrontend, `/blog/comments`),
        data: { commentId, postId: payload.postId },
        idempotencyKey: commentId ? `comment.pending:${commentId}:${adminId}` : undefined,
      }),
    );
  }

  if (key === 'blog.comment.reported' || key === 'COMMENT_REPORTED') {
    const commentId = String(payload.commentId || '');
    const reason = payload.reason ? String(payload.reason) : undefined;
    return adminJobs(ctx.adminIds, (adminId) =>
      buildJob({
        userId: adminId,
        notificationType: NotificationEventType.COMMENT_REPORTED,
        title: 'Comment reported',
        message: reason
          ? `A blog comment was reported: ${reason}`
          : 'A blog comment was reported and needs review.',
        actionUrl: appPath(adminFrontend, `/blog/comments`),
        priority: 'HIGH',
        data: { commentId, postId: payload.postId, reason },
        idempotencyKey: commentId ? `comment.reported:${commentId}:${adminId}` : undefined,
      }),
    );
  }

  if (key === 'quote.quote.expiring' || key === 'QUOTE_EXPIRING_SOON') {
    const userId = String(payload.userId || '');
    const quoteId = String(payload.quoteId || '');
    const quoteTitle = String(payload.quoteTitle || 'your quote');
    if (!userId) return [];
    return [
      buildJob({
        userId,
        notificationType: NotificationEventType.QUOTE_EXPIRING,
        title: 'Quote expiring soon',
        message: `Your quote "${quoteTitle}" expires within 24 hours.`,
        actionUrl: quoteId ? appPath(userFrontend, `/quotes/${quoteId}`) : appPath(userFrontend, `/quotes`),
        priority: 'HIGH',
        data: { quoteId, validUntil: payload.validUntil },
        idempotencyKey: quoteId ? `quote.expiring:${quoteId}:${userId}` : undefined,
      }),
    ];
  }

  if (key === 'quote.quote.expired' || key === 'QUOTE_EXPIRED') {
    const userId = String(payload.userId || '');
    const quoteId = String(payload.quoteId || '');
    const quoteTitle = String(payload.quoteTitle || 'your quote');
    if (!userId) return [];
    return [
      buildJob({
        userId,
        notificationType: NotificationEventType.QUOTE_EXPIRED,
        title: 'Quote expired',
        message: `Your quote "${quoteTitle}" has expired.`,
        actionUrl: quoteId ? appPath(userFrontend, `/quotes/${quoteId}`) : appPath(userFrontend, `/quotes`),
        data: { quoteId },
        idempotencyKey: quoteId ? `quote.expired:${quoteId}:${userId}` : undefined,
      }),
    ];
  }

  if (key === 'media.media.quarantined' || key === 'MEDIA_QUARANTINED') {
    const mediaId = String(payload.mediaId || '');
    const filename = payload.filename ? String(payload.filename) : 'uploaded file';
    const uploaderId = payload.uploaderId ? String(payload.uploaderId) : '';
    const virusName = payload.virusName ? String(payload.virusName) : undefined;
    const jobs: NotificationJob[] = adminJobs(ctx.adminIds, (adminId) =>
      buildJob({
        userId: adminId,
        notificationType: NotificationEventType.MEDIA_QUARANTINED,
        title: 'Media quarantined',
        message: virusName
          ? `File "${filename}" was quarantined (${virusName}).`
          : `File "${filename}" was quarantined after a security scan.`,
        actionUrl: appPath(adminFrontend, `/media`),
        priority: 'CRITICAL',
        data: { mediaId, filename, virusName, uploaderId },
        idempotencyKey: mediaId ? `media.quarantined:${mediaId}:admin:${adminId}` : undefined,
      }),
    );
    if (uploaderId) {
      jobs.push(
        buildJob({
          userId: uploaderId,
          notificationType: NotificationEventType.MEDIA_QUARANTINED,
          title: 'Upload quarantined',
          message: `Your file "${filename}" was quarantined and cannot be used until reviewed.`,
          actionUrl: appPath(userFrontend, `/settings/account`),
          priority: 'CRITICAL',
          data: { mediaId, filename },
          idempotencyKey: mediaId
            ? `media.quarantined:${mediaId}:uploader:${uploaderId}`
            : undefined,
        }),
      );
    }
    return jobs;
  }

  if (key === 'media.media.released' || key === 'MEDIA_RELEASED') {
    const uploaderId = String(payload.uploaderId || payload.userId || '');
    const mediaId = String(payload.mediaId || '');
    if (!uploaderId) return [];
    return [
      buildJob({
        userId: uploaderId,
        notificationType: NotificationEventType.MEDIA_RELEASED,
        title: 'Upload released',
        message: 'Your quarantined file has been reviewed and released.',
        actionUrl: appPath(userFrontend, `/settings/account`),
        data: { mediaId },
        idempotencyKey: mediaId ? `media.released:${mediaId}:${uploaderId}` : undefined,
      }),
    ];
  }

  if (key === 'user.security.force_reset' || key === 'ADMIN_FORCE_PASSWORD_RESET') {
    const userId = String(payload.userId || '');
    if (!userId) return [];
    return [
      buildJob({
        userId,
        notificationType: NotificationEventType.ACCOUNT_FORCE_PASSWORD_RESET,
        title: 'Password reset required',
        message: 'An administrator requires you to set a new password before continuing.',
        actionUrl: appPath(userFrontend, `/settings/security`),
        priority: 'CRITICAL',
        data: { userId },
        idempotencyKey: `account.forcePasswordReset:${userId}`,
      }),
    ];
  }

  if (key === 'user.security.password_reset' || key === 'ADMIN_USER_PASSWORD_RESET') {
    const userId = String(payload.userId || '');
    if (!userId) return [];
    return [
      buildJob({
        userId,
        notificationType: NotificationEventType.ACCOUNT_PASSWORD_RESET,
        title: 'Password updated',
        message: 'Your account password was reset by an administrator.',
        actionUrl: appPath(userFrontend, `/settings/security`),
        priority: 'HIGH',
        data: { userId },
        idempotencyKey: `account.passwordReset:${userId}`,
      }),
    ];
  }

  if (key === 'auth.password.changed' || key === 'PASSWORD_RESET_COMPLETED') {
    const userId = String(payload.userId || '');
    if (!userId) return [];
    return [
      buildJob({
        userId,
        notificationType: NotificationEventType.SECURITY_PASSWORD_CHANGED,
        title: 'Password changed',
        message: 'Your account password was changed successfully.',
        actionUrl: appPath(userFrontend, `/settings/security`),
        priority: 'HIGH',
        data: { userId },
        idempotencyKey: `security.passwordChanged:${userId}`,
      }),
    ];
  }

  if (key === 'user.account.suspended' || key === 'ADMIN_USER_STATUS_CHANGED') {
    const userId = String(payload.userId || '');
    const status = String(payload.status || '');
    if (!userId || status !== 'SUSPENDED') return [];
    return [
      buildJob({
        userId,
        notificationType: NotificationEventType.ACCOUNT_SUSPENDED,
        title: 'Account suspended',
        message:
          'Your account has been suspended. Contact support if you believe this is an error.',
        actionUrl: appPath(userFrontend, `/contact`),
        priority: 'HIGH',
        data: { userId, status },
        idempotencyKey: `account.suspended:${userId}`,
      }),
    ];
  }

  if (key === 'user.account.deleted' || key === 'ADMIN_USER_DELETED') {
    const userId = String(payload.userId || '');
    if (!userId) return [];
    return [
      buildJob({
        userId,
        notificationType: NotificationEventType.ACCOUNT_DELETED,
        title: 'Account deleted',
        message: 'Your account has been marked as deleted by an administrator.',
        actionUrl: appPath(userFrontend, `/contact`),
        priority: 'HIGH',
        data: { userId },
        idempotencyKey: `account.deleted:${userId}`,
      }),
    ];
  }

  if (key === 'user.account.restored' || key === 'ADMIN_USER_RESTORED') {
    const userId = String(payload.userId || '');
    if (!userId) return [];
    return [
      buildJob({
        userId,
        notificationType: NotificationEventType.ACCOUNT_RESTORED,
        title: 'Account restored',
        message: 'Your account has been restored and is active again.',
        actionUrl: appPath(userFrontend, `/dashboard`),
        data: { userId },
        idempotencyKey: `account.restored:${userId}`,
      }),
    ];
  }

  if (key === 'user.account.role_changed' || key === 'ADMIN_USER_ROLE_CHANGED') {
    const userId = String(payload.userId || '');
    const role = payload.role ? String(payload.role) : undefined;
    if (!userId) return [];
    return [
      buildJob({
        userId,
        notificationType: NotificationEventType.ACCOUNT_ROLE_CHANGED,
        title: 'Account role updated',
        message: role
          ? `Your account role was changed to ${role}.`
          : 'Your account role was updated.',
        actionUrl: appPath(userFrontend, `/settings/account`),
        data: { userId, role },
        idempotencyKey: role
          ? `account.roleChanged:${userId}:${role}`
          : `account.roleChanged:${userId}`,
      }),
    ];
  }

  if (key === 'user.account.deletion_scheduled' || key === 'USER_DELETION_REQUESTED') {
    const userId = String(payload.userId || '');
    if (!userId) return [];
    const jobs: NotificationJob[] = [
      buildJob({
        userId,
        notificationType: NotificationEventType.ACCOUNT_DELETION_SCHEDULED,
        title: 'Account deletion scheduled',
        message: 'Your account deletion request has been received.',
        actionUrl: appPath(userFrontend, `/settings/account`),
        data: { userId, deletionDate: payload.deletionDate },
        idempotencyKey: `account.deletionScheduled:${userId}`,
      }),
    ];
    jobs.push(
      ...adminJobs(ctx.adminIds, (adminId) =>
        buildJob({
          userId: adminId,
          notificationType: NotificationEventType.ACCOUNT_DELETION_SCHEDULED,
          title: 'User deletion requested',
          message: 'A user requested account deletion.',
          actionUrl: appPath(adminFrontend, `/users/${userId}`),
          data: { userId, deletionDate: payload.deletionDate },
          idempotencyKey: `account.deletionScheduled:admin:${userId}:${adminId}`,
        }),
      ),
    );
    return jobs;
  }

  if (key === 'user.account.deletion_cancelled' || key === 'USER_DELETION_CANCELLED') {
    const userId = String(payload.userId || '');
    if (!userId) return [];
    return [
      buildJob({
        userId,
        notificationType: NotificationEventType.ACCOUNT_DELETION_CANCELLED,
        title: 'Account deletion cancelled',
        message: 'Your account deletion request was cancelled. Your account remains active.',
        actionUrl: appPath(userFrontend, `/settings/account`),
        data: { userId },
        idempotencyKey: `account.deletionCancelled:${userId}`,
      }),
    ];
  }

  if (key === 'webhook.delivery.failed' || key === 'WEBHOOK_DELIVERY_FAILED') {
    const webhookId = String(payload.webhookId || '');
    const event = payload.event ? String(payload.event) : undefined;
    return adminJobs(ctx.adminIds, (adminId) =>
      buildJob({
        userId: adminId,
        notificationType: NotificationEventType.WEBHOOK_DELIVERY_FAILED,
        title: 'Webhook delivery failed',
        message: event
          ? `Outbound webhook delivery failed for event "${event}" after all retries.`
          : 'An outbound webhook delivery failed after all retries.',
        actionUrl: appPath(adminFrontend, `/settings/webhooks`),
        data: { webhookId, event, attempt: payload.attempt },
        idempotencyKey: webhookId
          ? `webhook.deliveryFailed:${webhookId}:${String(payload.event || 'unknown')}:${adminId}`
          : undefined,
      }),
    );
  }

  return [];
}
