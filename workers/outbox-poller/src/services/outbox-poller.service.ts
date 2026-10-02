import { Injectable, Logger, OnModuleInit, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaWriteService } from '@nestlancer/database';
import { MetricsService } from '@nestlancer/metrics';
import { QueuePublisherService } from '@nestlancer/queue';

import { LeaderElectionService } from './leader-election.service';
import { OutboxPublisherService } from './outbox-publisher.service';
import { OutboxEventStatus } from '../interfaces/outbox-event.interface';

/** Prisma outbox record shape (type/retries/error from schema) */
interface OutboxRecord {
  id: string;
  type: string;
  aggregateType?: string | null;
  aggregateId?: string | null;
  payload: unknown;
  status: string;
  error?: string | null;
  retries: number;
  nextRetryAt?: Date | null;
  createdAt: Date;
  publishedAt?: Date | null;
}

/**
 * Background polling service for Transactional Outbox events.
 * Implements leader election to ensure only a single instance polls the database.
 * Periodically fetches pending events and publishes them to RabbitMQ.
 */
@Injectable()
export class OutboxPollerService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(OutboxPollerService.name);
  private readonly batchSize: number;
  private readonly maxRetries: number;
  private readonly retryBackoffMs: number;
  private readonly retryBackoffMaxMs: number;
  private isProcessing = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaWriteService,
    private readonly leaderElection: LeaderElectionService,
    private readonly publisher: OutboxPublisherService,
    private readonly queuePublisher: QueuePublisherService,
    private readonly configService: ConfigService,
    private readonly metrics: MetricsService,
  ) {
    this.batchSize = this.configService.get<number>('outbox.batchSize') ?? 100;
    this.maxRetries = this.configService.get<number>('outbox.maxRetries') ?? 5;
    this.retryBackoffMs = this.configService.get<number>('outbox.retryBackoffMs') ?? 1000;
    this.retryBackoffMaxMs = this.configService.get<number>('outbox.retryBackoffMaxMs') ?? 300000;
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.queuePublisher.ensureChannel();
      this.logger.log('Outbox poller: RabbitMQ publisher channel ready');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(
        `Outbox poller: publisher not ready at startup (${msg}); will retry on poll`,
      );
    }

    this.metrics.createCounter(
      'outbox_polls_total',
      'Total number of outbox poll cycles (leader only)',
    );
    this.metrics.createCounter(
      'outbox_events_published_total',
      'Total outbox events successfully published',
    );
    this.metrics.createCounter('outbox_events_failed_total', 'Total outbox publication failures');
    this.metrics.createCounter(
      'outbox_events_marked_failed_total',
      'Total events permanently marked FAILED after max retries',
    );
    const intervalMs = this.configService.get<number>('outbox.pollingIntervalMs') ?? 5000;
    this.pollTimer = setInterval(() => this.poll(), intervalMs);
    this.logger.log(`Outbox poller started with interval ${intervalMs}ms`);
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    // Allow current batch to finish (Nest waits for in-flight work during shutdown)
    const deadline = Date.now() + 15000;
    while (this.isProcessing && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  /**
   * Periodic task to poll the outbox table. Checks for leadership before proceeding.
   */
  async poll(): Promise<void> {
    if (this.isProcessing) return;

    const isLeader = await this.leaderElection.acquireLock();
    if (!isLeader) return;

    if (!this.queuePublisher.isConnected()) {
      try {
        await this.queuePublisher.ensureChannel(6, 500);
      } catch {
        return;
      }
    }

    this.metrics.incrementCounter('outbox_polls_total');
    this.isProcessing = true;
    try {
      await this.processBatch();
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      this.logger.error(
        `[OutboxPoller] Critical error in polling cycle: ${error.message}`,
        error.stack,
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Fetches and processes a batch of pending outbox events.
   * Uses nextRetryAt for exponential backoff; marks FAILED after maxRetries and emits metric.
   */
  private async processBatch(): Promise<void> {
    const now = new Date();
    const events = (await (this.prisma as any).outbox.findMany({
      where: {
        status: OutboxEventStatus.PENDING,
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
      },
      orderBy: { createdAt: 'asc' },
      take: this.batchSize,
    })) as OutboxRecord[];

    if (events.length === 0) return;

    this.logger.debug(
      `[OutboxPoller] Found ${events.length} pending events. Starting publication batch.`,
    );

    for (const event of events) {
      try {
        await this.publisher.publish({
          ...event,
          eventType: event.type,
          retryCount: event.retries,
          lastError: event.error ?? undefined,
          updatedAt: event.createdAt,
        } as any);

        await (this.prisma as any).outbox.update({
          where: { id: event.id },
          data: {
            status: OutboxEventStatus.PUBLISHED,
            publishedAt: new Date(),
            nextRetryAt: null,
          },
        });
        this.metrics.incrementCounter('outbox_events_published_total');
      } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e));
        this.logger.error(
          `[OutboxPoller] Publication failed for EventID ${event.id}: ${error.message}`,
        );
        this.metrics.incrementCounter('outbox_events_failed_total');

        const newRetries = event.retries + 1;
        const isPermanentFailure = newRetries >= this.maxRetries;
        const backoffMs = Math.min(
          this.retryBackoffMaxMs,
          this.retryBackoffMs * Math.pow(2, event.retries),
        );
        const nextRetryAt = isPermanentFailure ? null : new Date(Date.now() + backoffMs);

        await (this.prisma as any).outbox.update({
          where: { id: event.id },
          data: {
            retries: newRetries,
            error: error.message,
            status: isPermanentFailure ? OutboxEventStatus.FAILED : OutboxEventStatus.PENDING,
            nextRetryAt,
          },
        });

        if (isPermanentFailure) {
          this.metrics.incrementCounter('outbox_events_marked_failed_total');
          this.logger.error(
            `[OutboxPoller] Event ${event.id} permanently FAILED after ${this.maxRetries} retries. Last error: ${error.message}`,
          );
        }
      }
    }
  }
}
