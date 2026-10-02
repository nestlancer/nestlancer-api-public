import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as client from 'prom-client';
import { openMetricsContentType, type OpenMetricsContentType } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly logger = new Logger(MetricsService.name);
  readonly registry: client.Registry<OpenMetricsContentType>;
  private readonly counters = new Map<string, client.Counter<string>>();
  private readonly histograms = new Map<string, client.Histogram<string>>();
  private readonly gauges = new Map<string, client.Gauge<string>>();

  constructor() {
    this.registry = new client.Registry<OpenMetricsContentType>();
    this.registry.setContentType(openMetricsContentType);
    this.registry.setDefaultLabels({
      app: process.env.APP_NAME || 'nestlancer',
      env: process.env.NODE_ENV || 'development',
      service: process.env.OTEL_SERVICE_NAME || process.env.APP_NAME || 'nestlancer',
    });
  }

  onModuleInit(): void {
    // Collect default Node.js metrics (GC, event loop, memory, etc.)
    client.collectDefaultMetrics({ register: this.registry });
    this.logger.log('Prometheus metrics initialized with default collectors');
  }

  createCounter(
    name: string,
    help: string,
    labelNames: string[] = [],
    options?: { enableExemplars?: boolean },
  ): client.Counter<string> {
    if (this.counters.has(name)) return this.counters.get(name)!;
    const counter = new client.Counter({
      name,
      help,
      labelNames,
      registers: [this.registry],
      enableExemplars: options?.enableExemplars,
    });
    this.counters.set(name, counter);
    return counter;
  }

  createHistogram(
    name: string,
    help: string,
    labelNames: string[] = [],
    buckets?: number[],
    options?: { enableExemplars?: boolean },
  ): client.Histogram<string> {
    if (this.histograms.has(name)) return this.histograms.get(name)!;
    const histogram = new client.Histogram({
      name,
      help,
      labelNames,
      buckets: buckets || [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
      enableExemplars: options?.enableExemplars,
    });
    this.histograms.set(name, histogram);
    return histogram;
  }

  createGauge(name: string, help: string, labelNames: string[] = []): client.Gauge<string> {
    if (this.gauges.has(name)) return this.gauges.get(name)!;
    const gauge = new client.Gauge({ name, help, labelNames, registers: [this.registry] });
    this.gauges.set(name, gauge);
    return gauge;
  }

  incrementCounter(name: string, labels?: Record<string, string>, value: number = 1): void {
    const counter = this.counters.get(name);
    if (counter) {
      labels ? counter.inc(labels, value) : counter.inc(value);
    }
  }

  observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const histogram = this.histograms.get(name);
    if (histogram) {
      labels ? histogram.observe(labels, value) : histogram.observe(value);
    }
  }

  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const gauge = this.gauges.get(name);
    if (gauge) {
      labels ? gauge.set(labels, value) : gauge.set(value);
    }
  }

  increment(name: string, labels?: Record<string, string>, value: number = 1): void {
    this.incrementCounter(name, labels, value);
  }
  gauge(name: string, value: number, labels?: Record<string, string>): void {
    this.setGauge(name, value, labels);
  }
  timing(name: string, value: number, labels?: Record<string, string>): void {
    this.observeHistogram(name, value, labels);
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}
