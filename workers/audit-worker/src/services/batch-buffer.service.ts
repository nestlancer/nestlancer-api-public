import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuditEntry } from '../interfaces/audit-job.interface';

/**
 * Buffering service that collects audit items for batch insertion.
 * Flush is triggered by the consuming service (AuditWorkerService) when buffer size is reached or on its own interval.
 *
 * @template T - The type of items being buffered
 */
@Injectable()
export class BatchBufferService<T = AuditEntry> {
  private buffer: T[] = [];
  private readonly batchSize: number;

  constructor(private readonly configService: ConfigService) {
    this.batchSize = this.configService.get<number>('audit.batchSize', 100);
  }

  /**
   * Adds an item to the buffer.
   *
   * @param item - The item to add
   * @returns True if the buffer has reached the batch size and the caller should flush
   */
  add(item: T): boolean {
    this.buffer.push(item);
    return this.buffer.length >= this.batchSize;
  }

  /**
   * Drains all items from the buffer and resets it.
   *
   * @returns An array containing all buffered items
   */
  drain(): T[] {
    const items = [...this.buffer];
    this.buffer = [];
    return items;
  }

  /**
   * Returns the current number of items in the buffer.
   */
  size(): number {
    return this.buffer.length;
  }
}
