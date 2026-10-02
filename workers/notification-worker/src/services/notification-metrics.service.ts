import { Injectable, OnModuleInit } from '@nestjs/common';

import { MetricsService } from '@nestlancer/metrics';

export const METRIC_NOTIFICATIONS_CREATED = 'notifications_created_total';
export const METRIC_MAPPER_EMPTY = 'notifications_mapper_empty_total';
export const METRIC_DLQ = 'notifications_dlq_total';
export const METRIC_WS_PUBLISH_LATENCY = 'notifications_ws_publish_latency_seconds';
export const METRIC_SKIPPED = 'notifications_skipped_total';

@Injectable()
export class NotificationMetricsService implements OnModuleInit {
  constructor(private readonly metrics: MetricsService) {}

  onModuleInit(): void {
    this.metrics.createCounter(METRIC_NOTIFICATIONS_CREATED, 'In-app notifications persisted', [
      'type',
    ]);
    this.metrics.createCounter(
      METRIC_MAPPER_EMPTY,
      'Domain events that produced zero notification jobs',
      ['routing_key'],
    );
    this.metrics.createCounter(METRIC_DLQ, 'Notification queue messages sent to DLQ', ['queue']);
    this.metrics.createCounter(METRIC_SKIPPED, 'Notifications skipped by gating', [
      'reason',
      'type',
    ]);
    this.metrics.createHistogram(
      METRIC_WS_PUBLISH_LATENCY,
      'Redis pub/sub latency for WS fan-out',
      ['event'],
    );
  }

  recordCreated(notificationType: string): void {
    this.metrics.incrementCounter(METRIC_NOTIFICATIONS_CREATED, { type: notificationType });
  }

  recordMapperEmpty(routingKey: string): void {
    this.metrics.incrementCounter(METRIC_MAPPER_EMPTY, {
      routing_key: routingKey || 'unknown',
    });
  }

  recordDlq(queue: string): void {
    this.metrics.incrementCounter(METRIC_DLQ, { queue });
  }

  recordSkipped(reason: string, notificationType: string): void {
    this.metrics.incrementCounter(METRIC_SKIPPED, { reason, type: notificationType });
  }

  recordWsPublishLatency(event: string, seconds: number): void {
    this.metrics.observeHistogram(METRIC_WS_PUBLISH_LATENCY, seconds, { event });
  }
}
