import { Injectable, Logger } from '@nestjs/common';

/**
 * Database-backed idempotency store using PrismaService.
 * Acts as persistent fallback for the Redis store.
 * Stores idempotency records in the `idempotency_keys` table.
 */
@Injectable()
export class DatabaseIdempotencyStore {
  private readonly logger = new Logger(DatabaseIdempotencyStore.name);

  // PrismaService injected via module-level DI
  private prisma: any;

  setPrisma(prisma: any): void {
    this.prisma = prisma;
  }

  async get(key: string): Promise<{ responseCode: number; responseBody: unknown } | null> {
    if (!this.prisma) {
      this.logger.warn('PrismaService not available for DatabaseIdempotencyStore');
      return null;
    }

    try {
      const record = await this.prisma.idempotencyKey.findUnique({
        where: { key },
      });

      if (!record) return null;

      // Check if record has expired
      if (record.expiresAt && new Date() > record.expiresAt) {
        await this.prisma.idempotencyKey.delete({ where: { key } });
        return null;
      }

      return {
        responseCode: record.responseCode,
        responseBody: record.responseBody,
      };
    } catch (error) {
      this.logger.error(`Failed to get idempotency record: ${key}`, error);
      return null;
    }
  }

  async set(
    key: string,
    response: { responseCode: number; responseBody: unknown },
    ttlSeconds: number = 86400,
  ): Promise<void> {
    if (!this.prisma) {
      this.logger.warn('PrismaService not available for DatabaseIdempotencyStore');
      return;
    }

    try {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

      await this.prisma.idempotencyKey.upsert({
        where: { key },
        create: {
          key,
          responseCode: response.responseCode,
          responseBody: response.responseBody,
          expiresAt,
        },
        update: {
          responseCode: response.responseCode,
          responseBody: response.responseBody,
          expiresAt,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to set idempotency record: ${key}`, error);
    }
  }
}
