import { Injectable, Logger } from '@nestjs/common';

import { PrismaReadService } from '@nestlancer/database';

/**
 * Enriches outbox/event payloads with display fields and resolved recipient IDs before mapping.
 */
@Injectable()
export class NotificationEnrichmentService {
  private readonly logger = new Logger(NotificationEnrichmentService.name);

  constructor(private readonly prisma: PrismaReadService) {}

  async enrich(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const enriched = { ...payload };

    if (enriched.requestId && !enriched.requestTitle) {
      const request = await this.prisma.projectRequest.findUnique({
        where: { id: String(enriched.requestId) },
        select: {
          title: true,
          category: true,
          userId: true,
          user: { select: { firstName: true, lastName: true } },
        },
      });
      if (request) {
        enriched.requestTitle = request.title;
        enriched.category = enriched.category ?? request.category;
        enriched.userId = enriched.userId ?? request.userId;
        enriched.submitterName =
          enriched.submitterName ??
          ([request.user.firstName, request.user.lastName].filter(Boolean).join(' ') || 'Client');
      }
    }

    if (enriched.quoteId) {
      const quote = await this.prisma.quote.findUnique({
        where: { id: String(enriched.quoteId) },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          request: { select: { title: true } },
        },
      });
      if (quote) {
        enriched.userId = enriched.userId ?? quote.userId;
        enriched.clientId = enriched.clientId ?? quote.userId;
        enriched.createdById = enriched.createdById ?? quote.createdById;
        enriched.amount = enriched.amount ?? quote.totalAmount;
        enriched.totalAmount = enriched.totalAmount ?? quote.totalAmount;
        enriched.currency = enriched.currency ?? quote.currency;
        enriched.projectTitle = enriched.projectTitle ?? quote.request?.title ?? quote.title;
        enriched.clientName =
          enriched.clientName ??
          ([quote.user.firstName, quote.user.lastName].filter(Boolean).join(' ') || 'Client');
      }
    }

    if (
      enriched.paymentId &&
      (!enriched.clientId ||
        !enriched.amount ||
        !enriched.projectTitle ||
        !enriched.milestoneName)
    ) {
      const payment = await this.prisma.payment.findUnique({
        where: { id: String(enriched.paymentId) },
        include: {
          client: { select: { id: true, firstName: true } },
          project: { select: { id: true, title: true } },
          milestone: { select: { name: true } },
        },
      });
      if (payment) {
        enriched.clientId = enriched.clientId ?? payment.clientId;
        enriched.userId = enriched.userId ?? payment.clientId;
        enriched.projectId = enriched.projectId ?? payment.projectId;
        enriched.amount = enriched.amount ?? payment.amount;
        enriched.currency = enriched.currency ?? payment.currency;
        enriched.milestoneName = enriched.milestoneName ?? payment.milestone?.name;
        enriched.clientName = enriched.clientName ?? payment.client?.firstName;
        enriched.projectTitle = enriched.projectTitle ?? payment.project?.title;
      }
    }

    // DOCUMENT_READY often only has entityId + documentType — resolve payment/quote context.
    await this.enrichDocumentEntity(enriched);

    if (
      enriched.projectId &&
      (!enriched.clientId ||
        !enriched.projectTitle ||
        !enriched.adminId ||
        enriched.amount == null)
    ) {
      const project = await this.prisma.project.findUnique({
        where: { id: String(enriched.projectId) },
        select: {
          clientId: true,
          adminId: true,
          title: true,
          client: { select: { firstName: true } },
          quote: { select: { totalAmount: true, currency: true } },
        },
      });
      if (project) {
        enriched.clientId = enriched.clientId ?? project.clientId;
        enriched.userId = enriched.userId ?? project.clientId;
        enriched.adminId = enriched.adminId ?? project.adminId;
        enriched.projectTitle = enriched.projectTitle ?? project.title;
        enriched.clientName = enriched.clientName ?? project.client?.firstName;
        // NL-NOTIF-002: surface contract value on project status notifications.
        if (enriched.amount == null && project.quote?.totalAmount != null) {
          enriched.amount = project.quote.totalAmount;
          enriched.currency = enriched.currency ?? project.quote.currency ?? 'INR';
        }
      }
    }

    if (enriched.postId && !enriched.postTitle) {
      const post = await this.prisma.blogPost.findUnique({
        where: { id: String(enriched.postId) },
        select: { title: true, slug: true },
      });
      if (post) {
        enriched.postTitle = post.title;
        enriched.postSlug = post.slug;
      }
    }

    await this.enrichContactUserByEmail(enriched);
    await this.enrichMessageRecipients(enriched);
    await this.enrichSenderName(enriched);

    return enriched;
  }

  private async enrichDocumentEntity(enriched: Record<string, unknown>): Promise<void> {
    if (
      enriched.projectTitle &&
      enriched.amount != null &&
      (enriched.paymentId || enriched.quoteId || enriched.projectId)
    ) {
      return;
    }
    const entityId = enriched.entityId ? String(enriched.entityId) : '';
    if (!entityId) return;
    const docType = String(enriched.documentType || '').toUpperCase();

    try {
      if (
        !enriched.paymentId &&
        (docType.includes('INVOICE') ||
          docType.includes('RECEIPT') ||
          docType.includes('REMINDER') ||
          docType.includes('PAYMENT'))
      ) {
        const payment = await this.prisma.payment.findUnique({
          where: { id: entityId },
          include: {
            project: { select: { id: true, title: true } },
            milestone: { select: { name: true } },
          },
        });
        if (payment) {
          enriched.paymentId = enriched.paymentId ?? payment.id;
          enriched.projectId = enriched.projectId ?? payment.projectId;
          enriched.projectTitle = enriched.projectTitle ?? payment.project?.title;
          enriched.milestoneName = enriched.milestoneName ?? payment.milestone?.name;
          enriched.amount = enriched.amount ?? payment.amount;
          enriched.currency = enriched.currency ?? payment.currency;
          enriched.clientId = enriched.clientId ?? payment.clientId;
          enriched.userId = enriched.userId ?? payment.clientId;
        } else if (enriched.amount == null) {
          const document = await this.prisma.generatedDocument.findUnique({
            where: { id: entityId },
            select: { entityId: true, entityType: true },
          });
          if (document?.entityType === 'PAYMENT' && document.entityId) {
            const linked = await this.prisma.payment.findUnique({
              where: { id: document.entityId },
              include: { project: { select: { id: true, title: true } } },
            });
            if (linked) {
              enriched.paymentId = enriched.paymentId ?? linked.id;
              enriched.projectId = enriched.projectId ?? linked.projectId;
              enriched.projectTitle = enriched.projectTitle ?? linked.project?.title;
              enriched.amount = linked.amount;
              enriched.currency = enriched.currency ?? linked.currency;
              enriched.clientId = enriched.clientId ?? linked.clientId;
              enriched.userId = enriched.userId ?? linked.clientId;
            }
          }
        }
      }

      if (
        !enriched.quoteId &&
        (docType.includes('QUOTE') || docType.includes('CONTRACT'))
      ) {
        const quote = await this.prisma.quote.findUnique({
          where: { id: entityId },
          include: { request: { select: { title: true } } },
        });
        if (quote) {
          enriched.quoteId = enriched.quoteId ?? quote.id;
          enriched.projectTitle =
            enriched.projectTitle ?? quote.request?.title ?? quote.title;
          enriched.amount = enriched.amount ?? quote.totalAmount;
          enriched.currency = enriched.currency ?? quote.currency;
          enriched.userId = enriched.userId ?? quote.userId;
          enriched.clientId = enriched.clientId ?? quote.userId;
        }
      }
    } catch (e: unknown) {
      this.logger.warn(`Document entity enrichment failed: ${(e as Error).message}`);
    }
  }

  private async enrichSenderName(enriched: Record<string, unknown>): Promise<void> {
    if (enriched.senderName || !enriched.senderId) return;
    try {
      const sender = await this.prisma.user.findUnique({
        where: { id: String(enriched.senderId) },
        select: { firstName: true, lastName: true, email: true },
      });
      if (!sender) return;
      const name = [sender.firstName, sender.lastName].filter(Boolean).join(' ').trim();
      enriched.senderName = name || sender.email || 'Someone';
    } catch (e: unknown) {
      this.logger.warn(`Sender name lookup failed: ${(e as Error).message}`);
    }
  }

  private buildMessagePreview(
    content: string | null | undefined,
    type: string | null | undefined,
  ): string | undefined {
    if (!content?.trim()) return undefined;
    const messageType = String(type || 'TEXT').toUpperCase();
    if (messageType === 'SYSTEM' || messageType === 'NOTIFICATION') return undefined;
    if (messageType === 'FILE') {
      try {
        const parsed = JSON.parse(content) as { caption?: string; filename?: string };
        if (parsed.caption?.trim()) return this.truncatePreview(parsed.caption);
        if (parsed.filename?.trim()) return `Attachment: ${parsed.filename.trim()}`;
      } catch {
        /* fall through */
      }
      return 'Sent an attachment';
    }
    return this.truncatePreview(content);
  }

  private truncatePreview(raw: string, max = 100): string {
    const cleaned = raw.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= max) return cleaned;
    return `${cleaned.slice(0, max - 1).trimEnd()}…`;
  }

  private async enrichContactUserByEmail(enriched: Record<string, unknown>): Promise<void> {
    if (enriched.userId) return;
    const email = enriched.contactEmail ?? enriched.email;
    if (typeof email !== 'string' || !email.trim()) return;
    try {
      const user = await this.prisma.user.findFirst({
        where: { email: email.trim().toLowerCase(), deletedAt: null },
        select: { id: true },
      });
      if (user) enriched.userId = user.id;
    } catch (e: unknown) {
      this.logger.warn(`Contact email user lookup failed: ${(e as Error).message}`);
    }
  }

  private async enrichMessageRecipients(enriched: Record<string, unknown>): Promise<void> {
    let projectId = enriched.projectId as string | undefined;
    let senderId = enriched.senderId as string | undefined;
    let messageType = enriched.messageType as string | undefined;

    if (enriched.messageId) {
      try {
        const message = await this.prisma.message.findUnique({
          where: { id: String(enriched.messageId) },
          include: {
            thread: {
              select: {
                id: true,
                title: true,
                type: true,
                members: { select: { userId: true } },
              },
            },
            project: { select: { id: true, title: true, clientId: true, adminId: true } },
          },
        });
        if (!message) return;

        projectId = projectId ?? message.projectId ?? undefined;
        senderId = senderId ?? message.senderId;
        messageType = messageType ?? message.type ?? undefined;
        enriched.threadId = enriched.threadId ?? message.threadId ?? undefined;
        enriched.messagePreview =
          enriched.messagePreview ??
          this.buildMessagePreview(message.content, message.type);

        if (message.project) {
          enriched.projectTitle = enriched.projectTitle ?? message.project.title;
          enriched.clientId = enriched.clientId ?? message.project.clientId;
          enriched.adminId = enriched.adminId ?? message.project.adminId;
        }

        const threadType = message.thread?.type;
        const threadTitle = message.thread?.title?.trim();
        if (!enriched.conversationLabel) {
          if (message.project?.title) {
            enriched.conversationLabel = message.project.title;
          } else if (threadType === 'DIRECT') {
            enriched.conversationLabel = 'your Direct conversation';
          } else if (threadTitle) {
            enriched.conversationLabel = threadTitle;
          } else if (threadType === 'GROUP') {
            enriched.conversationLabel = 'your group conversation';
          }
        }

        // Keep projectTitle for project chats only — avoid "on Direct message".
        if (!enriched.projectTitle && message.project?.title) {
          enriched.projectTitle = message.project.title;
        } else if (!enriched.projectTitle && threadType !== 'DIRECT' && threadTitle) {
          enriched.projectTitle = threadTitle;
        }

        if (message.threadId && message.thread?.members?.length) {
          const memberIds = message.thread.members.map((m) => m.userId);
          if (memberIds.length > 2) {
            enriched.recipientIds = memberIds.filter((id) => id !== senderId);
          } else if (!enriched.recipientId) {
            const recipient = message.thread.members.find((m) => m.userId !== senderId);
            if (recipient) enriched.recipientId = recipient.userId;
          }
        }
      } catch (e: unknown) {
        this.logger.warn(`Message recipient lookup failed: ${(e as Error).message}`);
        return;
      }
    }

    if (!projectId || enriched.recipientId) return;

    try {
      const project =
        enriched.clientId !== null && enriched.clientId !== undefined
          ? {
              clientId: String(enriched.clientId),
              adminId: (enriched.adminId as string | null) ?? null,
              title: enriched.projectTitle ? String(enriched.projectTitle) : undefined,
            }
          : await this.prisma.project.findUnique({
              where: { id: projectId },
              select: { clientId: true, adminId: true, title: true },
            });

      if (!project) return;

      enriched.projectTitle = enriched.projectTitle ?? project.title;
      enriched.clientId = enriched.clientId ?? project.clientId;
      enriched.adminId = enriched.adminId ?? project.adminId;

      if (messageType === 'SYSTEM' || (senderId && senderId !== project.clientId)) {
        enriched.recipientId = project.clientId;
        return;
      }

      if (senderId === project.clientId) {
        if (project.adminId) {
          enriched.recipientId = project.adminId;
        } else {
          // Prefer a single operator inbox over fan-out to every admin (H3 unread flood).
          enriched.recipientId = undefined;
          enriched.notifyAllAdmins = false;
          const opsAdmin = await this.prisma.user.findFirst({
            where: { role: 'ADMIN', deletedAt: null, status: 'ACTIVE' },
            orderBy: { createdAt: 'asc' },
            select: { id: true },
          });
          if (opsAdmin) {
            enriched.recipientId = opsAdmin.id;
          }
        }
      }
    } catch (e: unknown) {
      this.logger.warn(`Project message recipient lookup failed: ${(e as Error).message}`);
    }
  }
}
