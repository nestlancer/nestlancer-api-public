import { Injectable, OnModuleInit } from '@nestjs/common';
import { MetricsService } from '../metrics.service';
import * as client from 'prom-client';

@Injectable()
export class HttpMetricsCollector implements OnModuleInit {
  private requestsTotal!: client.Counter<string>;
  private requestDuration!: client.Histogram<string>;
  private requestSizeBytes!: client.Histogram<string>;
  private responseSizeBytes!: client.Histogram<string>;
  private activeRequests!: client.Gauge<string>;

  constructor(private readonly metrics: MetricsService) {}

  onModuleInit(): void {
    this.requestsTotal = this.metrics.createCounter(
      'http_requests_total',
      'Total number of HTTP requests',
      ['method', 'route', 'status_code'],
    );

    this.requestDuration = this.metrics.createHistogram(
      'http_request_duration_seconds',
      'HTTP request duration in seconds',
      ['method', 'route', 'status_code'],
      [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    );

    this.requestSizeBytes = this.metrics.createHistogram(
      'http_request_size_bytes',
      'HTTP request size in bytes',
      ['method', 'route'],
      [100, 1000, 10000, 100000, 1000000],
    );

    this.responseSizeBytes = this.metrics.createHistogram(
      'http_response_size_bytes',
      'HTTP response size in bytes',
      ['method', 'route'],
      [100, 1000, 10000, 100000, 1000000],
    );

    this.activeRequests = this.metrics.createGauge(
      'http_active_requests',
      'Number of active HTTP requests',
      ['method'],
    );
  }

  recordRequest(
    method: string,
    route: string,
    statusCode: number,
    durationSec: number,
    requestSize: number,
    responseSize: number,
  ): void {
    const labels = { method, route, status_code: String(statusCode) };
    this.requestsTotal.inc(labels);
    this.requestDuration.observe(labels, durationSec);
    this.requestSizeBytes.observe({ method, route }, requestSize);
    this.responseSizeBytes.observe({ method, route }, responseSize);
  }

  incrementActive(method: string): void {
    this.activeRequests.inc({ method });
  }

  decrementActive(method: string): void {
    this.activeRequests.dec({ method });
  }
}
