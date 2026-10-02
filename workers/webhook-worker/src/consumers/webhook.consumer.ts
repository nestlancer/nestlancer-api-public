import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ConsumeMessage } from 'amqplib';

import { PrismaWriteService } from '@nestlancer/database';
import { LoggerService } from '@nestlancer/logger';
import { MetricsService } from '@nestlancer/metrics';
import { QueueConsumerService, DlqService } from '@nestlancer/queue';

import { WEBHOOK_QUEUE_PAYMENTS, WEBHOOK_QUEUE_SYSTEM } from '../config/webhook-worker.config';
import { IncomingWebhookJob } from '../interfaces/webhook-job.interface';
import { WebhookWorkerService } from '../services/webhook-worker.service';

const METRIC_PROCESSED = 'webhook_processed_total';
const METRIC_FAILED = 'webhook_failed_total';

/**
 * Consumes webhook jobs from RabbitMQ (payments.webhook.queue, system.webhook.queue).
 * Message shape from webhooks service: { provider, eventType, eventId, timestamp, rawPayloadId, data }
 * Implements idempotency (skip if already PROCESSED), retries with backoff, DLQ on final failure, and metrics.
 */
@Injectable()
export class WebhookConsumer implements OnModuleInit {
  private processedCounter = METRIC_PROCESSED;
  private failedCounter = METRIC_FAILED;

  constructor(
    private readonly logger: LoggerService,
    private readonly queueConsumer: QueueConsumerService,
    private readonly webhookWorkerService: WebhookWorkerService,
    private readonly prisma: PrismaWriteService,
    private readonly configService: ConfigService,
    private readonly dlq: DlqService,
    private readonly metrics: MetricsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const queues: string[] = this.configService.get<string[]>('webhook-worker.queues') ?? [
      WEBHOOK_QUEUE_PAYMENTS,
      WEBHOOK_QUEUE_SYSTEM,
    ];

    const channel = this.queueConsumer.getChannel();
    if (channel) {
      for (const queueName of queues) {
        await channel.assertQueue(`${queueName}.dlq`, { durable: true });
      }
    }
    for (const queueName of queues) {
      this.logger.log(`[WebhookConsumer] Subscribing to queue: ${queueName}`);
      await this.queueConsumer.consume(queueName, (msg: ConsumeMessage) =>
        this.handleMessage(queueName, msg),
      );
    }

    this.metrics.createCounter(METRIC_PROCESSED, 'Total webhooks processed', [
      'queue',
      'provider',
      'event_type',
    ]);
    this.metrics.createCounter(METRIC_FAILED, 'Total webhooks failed after retries', [
      'queue',
      'provider',
      'event_type',
    ]);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async handleMessage(queueName: string, msg: ConsumeMessage): Promise<void> {
    const raw = msg.content.toString();
    let body: {
      provider: string;
      eventType: string;
      eventId?: string;
      rawPayloadId: string;
      data: Record<string, any>;
    };

    try {
      body = JSON.parse(raw);
    } catch (e: any) {
      this.logger.error(`[WebhookConsumer] Invalid JSON on ${queueName}: ${e.message}`);
      throw e;
    }

    const { provider, eventType, eventId, rawPayloadId, data } = body;
    if (!provider || !eventType || !rawPayloadId) {
      this.logger.warn(
        `[WebhookConsumer] Skipping message missing provider/eventType/rawPayloadId`,
      );
      return;
    }

    const labels = { queue: queueName, provider, event_type: eventType };

    const existing = await this.prisma.webhookLog.findUnique({
      where: { id: rawPayloadId },
      select: { status: true },
    });
    if (existing?.status === 'PROCESSED') {
      this.logger.log(`[WebhookConsumer] Idempotent skip: ${rawPayloadId} already PROCESSED`);
      this.metrics.incrementCounter(this.processedCounter, labels);
      return;
    }

    const maxRetries = this.configService.get<number>('webhook-worker.maxRetries') ?? 5;
    const backoffBaseSeconds =
      this.configService.get<number>('webhook-worker.backoffBaseSeconds') ?? 10;
    const backoffMultiplier =
      this.configService.get<number>('webhook-worker.backoffMultiplier') ?? 3;

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.webhookWorkerService.dispatch(provider, eventType, data ?? {});

        await this.prisma.webhookLog.update({
          where: { id: rawPayloadId },
          data: { status: 'PROCESSED', processedAt: new Date() },
        });
        this.metrics.incrementCounter(this.processedCounter, labels);
        return;
      } catch (error: any) {
        lastError = error;
        this.logger.warn(
          `[WebhookConsumer] Attempt ${attempt}/${maxRetries} failed ${provider} ${eventType}: ${error.message}`,
        );
        if (attempt < maxRetries) {
          const delayMs = 1000 * backoffBaseSeconds * Math.pow(backoffMultiplier, attempt - 1);
          await this.sleep(delayMs);
        }
      }
    }

    const errorMessage = lastError?.message ?? 'Unknown error';
    this.logger.error(
      `[WebhookConsumer] Failed ${provider} ${eventType} after ${maxRetries} retries: ${errorMessage}`,
      lastError?.stack,
    );

    await this.prisma.webhookLog
      .update({
        where: { id: rawPayloadId },
        data: { status: 'FAILED', error: errorMessage },
      })
      .catch((err) =>
        this.logger.error(`[WebhookConsumer] Failed to update webhook log: ${err.message}`),
      );

    await this.dlq.sendToDlq(queueName, body, errorMessage);
    this.metrics.incrementCounter(this.failedCounter, labels);
  }
}
