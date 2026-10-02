import { Injectable, OnModuleInit } from '@nestjs/common';
import { MetricsService } from '../metrics.service';
import * as client from 'prom-client';

@Injectable()
export class QueueMetricsCollector implements OnModuleInit {
  private messagesPublished!: client.Counter<string>;
  private messagesConsumed!: client.Counter<string>;
  private messagesFailed!: client.Counter<string>;
  private messageProcessingDuration!: client.Histogram<string>;
  private queueDepth!: client.Gauge<string>;
  private dlqDepth!: client.Gauge<string>;

  constructor(private readonly metrics: MetricsService) {}

  onModuleInit(): void {
    this.messagesPublished = this.metrics.createCounter(
      'queue_messages_published_total',
      'Total number of messages published to queue',
      ['exchange', 'routing_key'],
    );

    this.messagesConsumed = this.metrics.createCounter(
      'queue_messages_consumed_total',
      'Total number of messages consumed from queue',
      ['queue', 'status'],
    );

    this.messagesFailed = this.metrics.createCounter(
      'queue_messages_failed_total',
      'Total number of failed message processing attempts',
      ['queue', 'error_type'],
    );

    this.messageProcessingDuration = this.metrics.createHistogram(
      'queue_message_processing_duration_seconds',
      'Message processing duration in seconds',
      ['queue'],
      [0.01, 0.05, 0.1, 0.5, 1, 5, 10, 30],
    );

    this.queueDepth = this.metrics.createGauge(
      'queue_depth',
      'Current number of messages in queue',
      ['queue'],
    );

    this.dlqDepth = this.metrics.createGauge(
      'queue_dlq_depth',
      'Current number of messages in dead letter queue',
      ['queue'],
    );
  }

  recordPublished(exchange: string, routingKey: string): void {
    this.messagesPublished.inc({ exchange, routing_key: routingKey });
  }

  recordConsumed(queue: string, status: 'success' | 'retry' = 'success'): void {
    this.messagesConsumed.inc({ queue, status });
  }

  recordFailed(queue: string, errorType: string): void {
    this.messagesFailed.inc({ queue, error_type: errorType });
  }

  recordProcessingDuration(queue: string, durationSec: number): void {
    this.messageProcessingDuration.observe({ queue }, durationSec);
  }

  setQueueDepth(queue: string, depth: number): void {
    this.queueDepth.set({ queue }, depth);
  }

  setDlqDepth(queue: string, depth: number): void {
    this.dlqDepth.set({ queue }, depth);
  }
}
