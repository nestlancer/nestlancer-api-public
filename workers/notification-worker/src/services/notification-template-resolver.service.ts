import { Injectable, Logger } from '@nestjs/common';

import { formatINR, NotificationJob } from '@nestlancer/common';
import { PrismaReadService } from '@nestlancer/database';
import {
  humanizeStatusLabel,
  preferMapperCopyWhenSparse,
  renderNotificationTemplate,
} from '@nestlancer/notifications';

/** DB templates often omit the rupee amount that the mapper already computed (NL-NOTIF-002). */
function ensureAmountInCopy(message: string, amountLabel: string): string {
  const text = message.trim();
  if (!amountLabel || text.includes(amountLabel)) return text;
  if (/is ready to download\.?$/i.test(text)) {
    return text.replace(/is ready to download\.?$/i, `(${amountLabel}) is ready to download.`);
  }
  return `${text} (${amountLabel})`;
}

@Injectable()
export class NotificationTemplateResolverService {
  private readonly logger = new Logger(NotificationTemplateResolverService.name);

  constructor(private readonly prisma: PrismaReadService) {}

  async applyTemplate(job: NotificationJob): Promise<NotificationJob> {
    const notificationType =
      job.notificationType ||
      (typeof job.notification.data?.type === 'string' ? job.notification.data.type : undefined);

    if (!notificationType) return job;

    try {
      const template = await this.prisma.notificationTemplate.findFirst({
        where: { eventType: notificationType, isActive: true },
        orderBy: { updatedAt: 'desc' },
      });
      if (!template) return job;

      const dataVars =
        typeof job.notification.data === 'object' && job.notification.data !== null
          ? (job.notification.data as Record<string, unknown>)
          : {};

      const amountLabel =
        (typeof dataVars.amountLabel === 'string' && dataVars.amountLabel.trim()) ||
        this.formatAmountLabel(dataVars.amount, dataVars.currency);

      const statusRaw = dataVars.statusLabel ?? dataVars.newStatus ?? dataVars.status;
      // Always humanize — never leave SCREAMING_SNAKE / camelCase enums in copy (NL-NOTIF-002).
      const statusLabel = humanizeStatusLabel(statusRaw);

      // Prefer structured payload fields (entryTitle / projectTitle) over the generic
      // notification title so templates like progress.entryCreated stay informative.
      const vars: Record<string, unknown> = {
        ...dataVars,
        title: dataVars.documentTitle ?? dataVars.entryTitle ?? dataVars.title ?? job.notification.title,
        message: job.notification.message,
        actionUrl: job.notification.actionUrl,
        userId: job.userId,
        entryTitle: dataVars.entryTitle ?? dataVars.title,
        documentTitle: dataVars.documentTitle ?? dataVars.title ?? job.notification.title,
        deliverableName: dataVars.deliverableName ?? dataVars.name,
        projectTitle: dataVars.projectTitle,
        amountLabel: amountLabel || undefined,
        amountSuffix: amountLabel ? ` (${amountLabel})` : '',
        statusLabel,
        newStatus: statusLabel,
        senderName: dataVars.senderName,
        requestTitle: dataVars.requestTitle,
        milestoneName: dataVars.milestoneName,
        conversationLabel: dataVars.conversationLabel ?? dataVars.projectTitle,
        messagePreview: dataVars.messagePreview,
      };

      const renderedTitle = renderNotificationTemplate(template.titleTemplate, vars);
      const renderedMessage = renderNotificationTemplate(template.messageTemplate, vars);

      return {
        ...job,
        notification: {
          ...job.notification,
          title: preferMapperCopyWhenSparse(
            template.titleTemplate,
            vars,
            renderedTitle,
            job.notification.title,
          ),
          message: ensureAmountInCopy(
            preferMapperCopyWhenSparse(
              template.messageTemplate,
              vars,
              renderedMessage,
              job.notification.message,
            ),
            amountLabel,
          ),
        },
        priority: job.priority || template.priority,
      };
    } catch (error: unknown) {
      this.logger.warn(
        `Template resolution failed for type=${notificationType}: ${(error as Error).message}`,
      );
      return job;
    }
  }

  private formatAmountLabel(amount: unknown, currency: unknown): string {
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
}
