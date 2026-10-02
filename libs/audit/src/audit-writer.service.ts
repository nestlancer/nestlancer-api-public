import { Injectable, Logger } from '@nestjs/common';
import { AuditEntry } from './interfaces/audit-entry.interface';
import { AuditRepository } from './audit.repository';

@Injectable()
export class AuditWriterService {
  private readonly logger = new Logger(AuditWriterService.name);
  private buffer: AuditEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private readonly batchSize: number;
  private readonly flushInterval: number;

  constructor(private readonly repository: AuditRepository) {
    this.batchSize = Number(process.env.AUDIT_WORKER_BATCH_SIZE || 50);
    this.flushInterval = Number(process.env.AUDIT_WORKER_FLUSH_INTERVAL || 5000);

    // Auto-flush on interval
    this.flushTimer = setInterval(() => this.flush(), this.flushInterval);
  }

  /**
   * Write a single audit entry. Buffers for batch insert efficiency.
   */
  async write(entry: AuditEntry): Promise<void> {
    this.buffer.push(entry);
    this.logger.debug(
      `Audit: ${entry.action} on ${entry.resourceType}:${entry.resourceId} by ${entry.userId}`,
    );

    if (this.buffer.length >= this.batchSize) {
      await this.flush();
    }
  }

  /**
   * Write directly without buffering (for critical audit events).
   */
  async writeDirect(entry: AuditEntry): Promise<string> {
    return this.repository.create({
      ...entry,
      changes: entry.changes,
      metadata: entry.metadata,
    });
  }

  /**
   * Flush the buffer — batch insert all pending audit entries.
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      await this.repository.createBatch(
        entries.map((entry) => ({
          userId: entry.userId,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          changes: entry.changes,
          metadata: entry.metadata,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
        })),
      );
    } catch (error) {
      this.logger.error(`Failed to flush ${entries.length} audit entries`, error);
      // Re-add to buffer for retry
      this.buffer.unshift(...entries);
    }
  }

  onModuleDestroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    // Final flush
    this.flush().catch((err) => this.logger.error('Final audit flush failed', err));
  }
}
