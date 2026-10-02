import { Injectable } from '@nestjs/common';

import { CacheService } from '@nestlancer/cache';
import { LoggerService } from '@nestlancer/logger';

import { AggregationResult } from '../interfaces/aggregation-result.interface';
import { AnalyticsJobType, Period } from '../interfaces/analytics-job.interface';

/**
 * Service responsible for managing the lifecycle of analytics results.
 * Handles retrieval and persistence of aggregated data in the cache layer.
 */
@Injectable()
export class AnalyticsWorkerService {
  constructor(
    private readonly logger: LoggerService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Retrieves the most recent analytics result for a specific report type.
   *
   * @param type - The type of analytics result to fetch
   * @returns A promise resolving to the latest cached result or null if not found
   */
  async getLatest(type: AnalyticsJobType): Promise<any> {
    const key = `analytics:${type.toLowerCase()}:latest`;
    return this.cache.get(key);
  }

  /**
   * Persists an aggregation result to the cache.
   * Updates both the period-specific key and the 'latest' alias for quick access.
   *
   * @param result - The aggregation result to save
   * @returns A promise that resolves when cache operations complete
   */
  async saveResult(result: AggregationResult): Promise<void> {
    const key = `analytics:${result.type.toLowerCase()}:${result.period.toLowerCase()}`;
    const latestKey = `analytics:${result.type.toLowerCase()}:latest`;

    // Calculate TTL based on the cachedUntil property
    const ttl = Math.max(0, result.cachedUntil.getTime() - Date.now());

    await this.cache.set(key, result, ttl);
    await this.cache.set(latestKey, result);

    this.logger.log(
      `[AnalyticsWorker] Saved ${result.type} result for period ${result.period}. Cache TTL: ${ttl}ms`,
    );
  }
}
