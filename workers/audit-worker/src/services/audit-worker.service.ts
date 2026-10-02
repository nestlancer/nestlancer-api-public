import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MetricsService } from '@nestlancer/metrics';

import { BatchBufferService } from './batch-buffer.service';
import { AuditEntryDto } from '../dto/audit-entry.dto';
import { AuditBatchInsertProcessor } from '../processors/audit-batch-insert.processor';

/**
 * Core service for the Audit Worker.
 * Manages buffering and batch processing of audit logs to optimize database write performance.
 * Implements graceful shutdown by flushing remaining logs on module destruction.
 */
@Injectable()
export class AuditWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditWorkerService.name);
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly flushIntervalMs: number;

  constructor(
    private readonly bufferService: BatchBufferService,
    private readonly processor: AuditBatchInsertProcessor,
    private readonly metrics: MetricsService,
    private readonly configService: ConfigService,
  ) {
    this.flushIntervalMs = this.configService.get<number>('audit.flushIntervalMs', 5000);
  }

  /**
   * Initializes the service by starting the periodic flush timer.
   */
  onModuleInit(): void {
    this.startFlushTimer();
  }

  /**
   * Ensures all buffered audit logs are flushed to the database before the application shuts down.
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('[AuditWorker] Shutting down, performing final audit flush...');
    this.stopFlushTimer();

    try {
      await this.flush();
    } catch (err: any) {
      this.logger.error(`[AuditWorker] Error during final audit flush: ${err.message}`);
    }
  }

  /**
   * Handles an incoming audit log entry.
   * Records metrics and adds the entry to the buffer for batch processing.
   *
   * @param entry - The audit log entry to process
   * @returns A promise that resolves when the entry is buffered (and potentially flushed)
   */
  async handleAuditEntry(entry: AuditEntryDto): Promise<void> {
    this.metrics.incrementCounter('audit.entries_received');
    const shouldFlush = this.bufferService.add(entry);
    this.metrics.setGauge('audit.buffer_size', this.bufferService.size());

    if (shouldFlush) {
      this.logger.debug(
        `[AuditWorker] Batch size reached (${this.bufferService.size()}), triggering flush.`,
      );
      await this.flush();
    }
  }

  /**
   * Drains the buffer and writes the audit logs to the primary database in a single batch.
   * Records processing latency and success metrics.
   *
   * @returns A promise that resolves when the batch insertion is complete
   */
  async flush(): Promise<void> {
    if (this.bufferService.size() === 0) return;

    const count = this.bufferService.size();
    this.logger.debug(`[AuditWorker] Flushing audit buffer (${count} entries)...`);

    const entries = this.bufferService.drain();
    const startTime = Date.now();

    try {
      await this.processor.insertBatch(entries);
      const duration = Date.now() - startTime;

      this.metrics.incrementCounter('audit.batch_inserted', undefined, entries.length);
      this.metrics.observeHistogram('audit.flush_duration', duration);
      this.metrics.setGauge('audit.buffer_size', 0);
    } catch (error: any) {
      this.logger.error(`[AuditWorker] Failed to flush audit batch: ${error.message}`, error.stack);
      // In a production scenario, we might want to dead-letter these or re-buffer
      throw error;
    }
  }

  /**
   * Starts the periodic flush timer based on configuration.
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch((err) => {
        this.logger.error(`[AuditWorker] Error during scheduled audit flush: ${err.message}`);
      });
    }, this.flushIntervalMs);
  }

  /**
   * Stops and clears the periodic flush timer.
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}
