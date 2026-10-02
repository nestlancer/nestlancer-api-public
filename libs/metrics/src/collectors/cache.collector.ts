import { Injectable, OnModuleInit } from '@nestjs/common';
import { MetricsService } from '../metrics.service';
import * as client from 'prom-client';

@Injectable()
export class CacheMetricsCollector implements OnModuleInit {
  private cacheHits!: client.Counter<string>;
  private cacheMisses!: client.Counter<string>;
  private cacheOperationDuration!: client.Histogram<string>;
  private cacheSize!: client.Gauge<string>;

  constructor(private readonly metrics: MetricsService) {}

  onModuleInit(): void {
    this.cacheHits = this.metrics.createCounter('cache_hits_total', 'Total number of cache hits', [
      'cache_name',
    ]);

    this.cacheMisses = this.metrics.createCounter(
      'cache_misses_total',
      'Total number of cache misses',
      ['cache_name'],
    );

    this.cacheOperationDuration = this.metrics.createHistogram(
      'cache_operation_duration_seconds',
      'Cache operation duration in seconds',
      ['operation', 'cache_name'],
      [0.001, 0.005, 0.01, 0.025, 0.05, 0.1],
    );

    this.cacheSize = this.metrics.createGauge('cache_keys_total', 'Total number of keys in cache', [
      'cache_name',
    ]);
  }

  recordHit(cacheName: string = 'default'): void {
    this.cacheHits.inc({ cache_name: cacheName });
  }

  recordMiss(cacheName: string = 'default'): void {
    this.cacheMisses.inc({ cache_name: cacheName });
  }

  recordOperationDuration(
    operation: string,
    durationSec: number,
    cacheName: string = 'default',
  ): void {
    this.cacheOperationDuration.observe({ operation, cache_name: cacheName }, durationSec);
  }

  setCacheSize(size: number, cacheName: string = 'default'): void {
    this.cacheSize.set({ cache_name: cacheName }, size);
  }
}
