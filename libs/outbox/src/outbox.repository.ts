import { Injectable, Logger } from '@nestjs/common';
import { OutboxEventPayload } from './interfaces/outbox-event.interface';

/**
 * Outbox repository using PrismaService for transactional outbox pattern.
 * Stores events within the same DB transaction as the business operation.
 */
@Injectable()
export class OutboxRepository {
  private readonly logger = new Logger(OutboxRepository.name);

  // Injected by the module that imports OutboxModule
  private prisma: any;

  setPrisma(prisma: any): void {
    this.prisma = prisma;
  }

  /**
   * Create an outbox event within an existing transaction.
   * @param event - The event payload to store
   * @param tx - Optional Prisma transaction client
   */
  async create(event: OutboxEventPayload, tx?: any): Promise<string> {
    const client = tx || this.prisma;
    if (!client) {
      this.logger.error('PrismaService not available for OutboxRepository');
      throw new Error('Database client not initialized');
    }

    const record = await client.outbox.create({
      data: {
        type: event.type || (event as any).eventType,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        payload: event.payload as any,
        status: 'PENDING',
        retries: 0,
        createdAt: new Date(),
      } as any,
    });

    this.logger.debug(`Created outbox event: ${record.id} (${event.type})`);
    return record.id;
  }

  /**
   * Find pending outbox events that haven't been published yet.
   */
  async findPending(limit: number): Promise<
    Array<{
      id: string;
      type: string;
      aggregateId: string;
      aggregateType: string;
      payload: unknown;
      retries: number;
    }>
  > {
    if (!this.prisma) return [];

    return this.prisma.outbox.findMany({
      where: {
        status: 'PENDING',
        retries: { lt: Number(process.env.OUTBOX_MAX_RETRIES || 5) },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  /**
   * Mark an outbox event as successfully published.
   */
  async markPublished(id: string): Promise<void> {
    if (!this.prisma) return;

    await this.prisma.outbox.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    this.logger.debug(`Outbox event ${id} marked as published`);
  }

  /**
   * Mark an outbox event as failed and increment retry count.
   */
  async markFailed(id: string, error: string): Promise<void> {
    if (!this.prisma) return;

    await this.prisma.outbox.update({
      where: { id },
      data: {
        status: 'FAILED',
        error: error,
        retries: { increment: 1 },
      },
    });

    this.logger.warn(`Outbox event ${id} marked as failed: ${error}`);
  }

  /**
   * Clean up old published events (retention policy).
   */
  async cleanupPublished(retentionDays: number = 7): Promise<number> {
    if (!this.prisma) return 0;

    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const result = await this.prisma.outbox.deleteMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { lt: cutoff },
      },
    });

    this.logger.log(`Cleaned up ${result.count} old outbox events`);
    return result.count;
  }
}
