import { Injectable, Logger } from '@nestjs/common';

import { PrismaReadService } from '@nestlancer/database';

/**
 * Enriches outbox/event payloads with recipient email when only userId is present.
 */
@Injectable()
export class EmailRecipientResolverService {
  private readonly logger = new Logger(EmailRecipientResolverService.name);

  constructor(private readonly prisma: PrismaReadService) {}

  async enrich(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const enriched = { ...payload };

    if (enriched.clientEmail || enriched.email) {
      return enriched;
    }

    const userId = enriched.userId || enriched.clientId;
    if (typeof userId === 'string') {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true },
      });
      if (user) {
        enriched.clientEmail = user.email;
        enriched.clientName = user.firstName || user.lastName || undefined;
      }
    }

    if (!enriched.clientEmail && enriched.paymentId) {
      const payment = await this.prisma.payment.findUnique({
        where: { id: String(enriched.paymentId) },
        include: { client: { select: { email: true, firstName: true } } },
      });
      if (payment?.client) {
        enriched.clientEmail = payment.client.email;
        enriched.clientName = payment.client.firstName || undefined;
        enriched.amount = enriched.amount ?? payment.amount;
        enriched.currency = enriched.currency ?? payment.currency;
      }
    }

    if (!enriched.clientEmail && enriched.quoteId) {
      const quote = await this.prisma.quote.findUnique({
        where: { id: String(enriched.quoteId) },
        include: { user: { select: { email: true, firstName: true } } },
      });
      if (quote?.user) {
        enriched.clientEmail = quote.user.email;
        enriched.clientName = quote.user.firstName || undefined;
        enriched.amount = enriched.amount ?? quote.totalAmount;
      }
    }

    if (!enriched.clientEmail && enriched.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: String(enriched.projectId) },
        include: { client: { select: { email: true, firstName: true } } },
      });
      if (project?.client) {
        enriched.clientEmail = project.client.email;
        enriched.clientName = project.client.firstName || undefined;
        enriched.projectName = enriched.projectName ?? project.title;
      }
    }

    if (!enriched.recipientEmail && enriched.messageId) {
      try {
        const message = await this.prisma.message.findUnique({
          where: { id: String(enriched.messageId) },
          include: {
            sender: { select: { firstName: true } },
            thread: {
              include: {
                members: {
                  include: { user: { select: { id: true, email: true, firstName: true } } },
                },
              },
            },
            project: { select: { title: true } },
          },
        });
        const senderId = enriched.senderId as string | undefined;
        const recipient = message?.thread?.members?.find((m) => m.userId !== senderId)?.user;
        if (recipient?.email) {
          enriched.recipientEmail = recipient.email;
          enriched.senderName = message?.sender?.firstName;
          enriched.projectTitle = message?.project?.title;
        }
      } catch (e: unknown) {
        this.logger.warn(`Message recipient lookup failed: ${(e as Error).message}`);
      }
    }

    return enriched;
  }
}
