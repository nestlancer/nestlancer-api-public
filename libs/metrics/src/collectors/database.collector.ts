import { Injectable, OnModuleInit } from '@nestjs/common';
import { MetricsService } from '../metrics.service';
import * as client from 'prom-client';

@Injectable()
export class DatabaseMetricsCollector implements OnModuleInit {
  private queriesTotal!: client.Counter<string>;
  private queryDuration!: client.Histogram<string>;
  private poolActiveConnections!: client.Gauge<string>;
  private poolIdleConnections!: client.Gauge<string>;
  private queryErrors!: client.Counter<string>;

  constructor(private readonly metrics: MetricsService) {}

  onModuleInit(): void {
    this.queriesTotal = this.metrics.createCounter(
      'db_queries_total',
      'Total number of database queries',
      ['operation', 'model'],
    );

    this.queryDuration = this.metrics.createHistogram(
      'db_query_duration_seconds',
      'Database query duration in seconds',
      ['operation', 'model'],
      [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 5],
    );

    this.poolActiveConnections = this.metrics.createGauge(
      'db_pool_active_connections',
      'Number of active database connections',
      ['pool'],
    );

    this.poolIdleConnections = this.metrics.createGauge(
      'db_pool_idle_connections',
      'Number of idle database connections',
      ['pool'],
    );

    this.queryErrors = this.metrics.createCounter(
      'db_query_errors_total',
      'Total number of database query errors',
      ['operation', 'model', 'error_type'],
    );
  }

  recordQuery(operation: string, model: string, durationSec: number): void {
    this.queriesTotal.inc({ operation, model });
    this.queryDuration.observe({ operation, model }, durationSec);
  }

  recordError(operation: string, model: string, errorType: string): void {
    this.queryErrors.inc({ operation, model, error_type: errorType });
  }

  setPoolMetrics(pool: string, active: number, idle: number): void {
    this.poolActiveConnections.set({ pool }, active);
    this.poolIdleConnections.set({ pool }, idle);
  }
}
