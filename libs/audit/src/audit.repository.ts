import { Injectable, Logger } from '@nestjs/common';

/**
 * Audit repository using PrismaService for persistent audit log storage.
 * Used by the AuditWriterService to write audit entries.
 */
@Injectable()
export class AuditRepository {
  private readonly logger = new Logger(AuditRepository.name);

  // Injected by the module that imports AuditModule
  private prisma: any;

  setPrisma(prisma: any): void {
    this.prisma = prisma;
  }

  /**
   * Create a single audit log entry.
   */
  async create(entry: Record<string, unknown>): Promise<string> {
    if (!this.prisma) {
      this.logger.warn('PrismaService not available — audit entry logged only');
      return `audit-${Date.now()}`;
    }

    const record = await this.prisma.auditLog.create({
      data: {
        userId: entry.userId as string,
        action: entry.action as string,
        resourceType: entry.resourceType as string,
        resourceId: entry.resourceId as string,
        changes: (entry.changes as any) || {},
        metadata: (entry.metadata as any) || {},
        ipAddress: (entry.ipAddress as string) || null,
        userAgent: (entry.userAgent as string) || null,
        createdAt: new Date(),
      },
    });

    return record.id;
  }

  /**
   * Create multiple audit entries in a batch (for high-throughput scenarios).
   */
  async createBatch(entries: Array<Record<string, unknown>>): Promise<number> {
    if (!this.prisma) {
      this.logger.warn('PrismaService not available — batch audit entries logged only');
      return 0;
    }

    const result = await this.prisma.auditLog.createMany({
      data: entries.map((entry) => ({
        userId: entry.userId as string,
        action: entry.action as string,
        resourceType: entry.resourceType as string,
        resourceId: entry.resourceId as string,
        changes: (entry.changes as any) || {},
        metadata: (entry.metadata as any) || {},
        ipAddress: (entry.ipAddress as string) || null,
        userAgent: (entry.userAgent as string) || null,
        createdAt: new Date(),
      })),
    });

    this.logger.debug(`Batch inserted ${result.count} audit entries`);
    return result.count;
  }

  /**
   * Find audit entries by resource type and ID.
   */
  async findByResource(resourceType: string, resourceId: string): Promise<unknown[]> {
    if (!this.prisma) return [];

    return this.prisma.auditLog.findMany({
      where: { resourceType, resourceId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Find audit entries by user.
   */
  async findByUser(userId: string, limit: number = 50): Promise<unknown[]> {
    if (!this.prisma) return [];

    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
