import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';

const STALE_EXPIRED_REQUEST_DAYS = parseInt(process.env.QUOTE_STALE_REJECT_DAYS || '30', 10);

/** Polls for quotes nearing or past validity and emits expiry notifications via outbox. */
@Injectable()
export class QuoteExpirySchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QuoteExpirySchedulerService.name);
  private intervalRef: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
  ) {}

  onModuleInit(): void {
    const ms = parseInt(process.env.QUOTE_EXPIRY_CRON_MS || '3600000', 10);
    this.intervalRef = setInterval(() => {
      void this.runExpiryChecks();
    }, ms);
    void this.runExpiryChecks();
  }

  onModuleDestroy(): void {
    if (this.intervalRef) clearInterval(this.intervalRef);
  }

  async runExpiryChecks(): Promise<void> {
    try {
      const expiring = await this.processExpiringSoon();
      const expired = await this.processExpired();
      const staleRejected = await this.processStaleExpiredRequests();
      if (expiring > 0 || expired > 0 || staleRejected > 0) {
        this.logger.log(
          `Quote expiry run: ${expiring} expiring-soon, ${expired} expired, ${staleRejected} stale requests rejected`,
        );
      }
    } catch (e) {
      this.logger.warn(`Quote expiry run failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private async processExpiringSoon(): Promise<number> {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const quotes = await this.prismaRead.quote.findMany({
      where: {
        status: { in: ['SENT', 'VIEWED'] },
        validUntil: { gt: now, lte: in24h },
      },
      select: { id: true, userId: true, title: true, validUntil: true },
      take: 50,
    });

    let processed = 0;
    for (const quote of quotes) {
      const existing = await this.prismaRead.outbox.findFirst({
        where: {
          type: 'QUOTE_EXPIRING_SOON',
          payload: { path: ['quoteId'], equals: quote.id },
        },
        select: { id: true },
      });
      if (existing) continue;

      await this.prismaWrite.outbox.create({
        data: {
          type: 'QUOTE_EXPIRING_SOON',
          aggregateType: 'QUOTE',
          aggregateId: quote.id,
          payload: {
            quoteId: quote.id,
            userId: quote.userId,
            quoteTitle: quote.title,
            validUntil: quote.validUntil.toISOString(),
          },
        },
      });
      processed += 1;
    }
    return processed;
  }

  private async processExpired(): Promise<number> {
    const now = new Date();

    const quotes = await this.prismaRead.quote.findMany({
      where: {
        status: { in: ['SENT', 'VIEWED', 'PENDING'] },
        validUntil: { lt: now },
      },
      select: { id: true, userId: true, title: true, requestId: true },
      take: 50,
    });

    let processed = 0;
    for (const quote of quotes) {
      try {
        await this.prismaWrite.$transaction(async (tx: any) => {
          const current = await tx.quote.findUnique({
            where: { id: quote.id },
            select: { status: true },
          });
          if (!current || current.status === 'EXPIRED') return;

          await tx.quote.update({
            where: { id: quote.id },
            data: { status: 'EXPIRED', expiredAt: now },
          });

          await tx.projectRequest.updateMany({
            where: {
              id: quote.requestId,
              status: { in: ['QUOTED', 'UNDER_REVIEW', 'SUBMITTED'] },
            },
            data: { status: 'EXPIRED_QUOTE' } as any,
          });

          await tx.outbox.create({
            data: {
              type: 'QUOTE_EXPIRED',
              aggregateType: 'QUOTE',
              aggregateId: quote.id,
              payload: {
                quoteId: quote.id,
                userId: quote.userId,
                requestId: quote.requestId,
                quoteTitle: quote.title,
              },
            },
          });
        });
        processed += 1;
      } catch {
        // skip conflicting row
      }
    }
    return processed;
  }

  private async processStaleExpiredRequests(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - STALE_EXPIRED_REQUEST_DAYS);

    const requests = await this.prismaRead.projectRequest.findMany({
      where: {
        status: 'EXPIRED_QUOTE' as any,
        updatedAt: { lt: cutoff },
      },
      select: { id: true },
      take: 50,
    });

    let processed = 0;
    for (const req of requests) {
      await this.prismaWrite.$transaction(async (tx: any) => {
        await tx.projectRequest.update({
          where: { id: req.id },
          data: { status: 'REJECTED' },
        });
        await tx.requestStatusHistory.create({
          data: {
            requestId: req.id,
            status: 'REJECTED',
            note: 'Auto-rejected: quote expired over 30 days ago',
          },
        });
      });
      processed += 1;
    }
    return processed;
  }
}
