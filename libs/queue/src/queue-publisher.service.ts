import { randomUUID } from 'crypto';

import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as amqp from 'amqplib';

import {
  getLogContext,
  normalizeCorrelationId,
  QUEUE_ANALYTICS,
  QUEUE_AUDIT,
  QUEUE_CDN,
  QUEUE_DOCUMENT,
  QUEUE_EMAIL,
  QUEUE_EXPORT,
  QUEUE_MEDIA,
  QUEUE_NOTIFICATION,
  QUEUE_WEBHOOK,
} from '@nestlancer/common';

function defaultPublishIds(options?: amqp.Options.Publish): amqp.Options.Publish {
  const ctx = getLogContext();
  const messageId = options?.messageId || randomUUID();
  const correlationId =
    normalizeCorrelationId(options?.correlationId, ctx.correlationId, messageId) || messageId;
  return {
    ...options,
    messageId,
    correlationId,
  };
}

@Injectable()
export class QueuePublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueuePublisherService.name);
  private connection: any = null;
  private channel: amqp.Channel | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;

  constructor(@Inject('QUEUE_OPTIONS') private readonly options: { url?: string }) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    await this.channel?.close();
    await this.connection?.close();
    this.channel = null;
    this.connection = null;
  }

  private async connect(): Promise<void> {
    if (this.isConnecting) return;
    this.isConnecting = true;
    try {
      const url = this.options.url || process.env.RABBITMQ_URL || 'amqp://localhost:5672';
      const connection = (await amqp.connect(url)) as any;
      connection.on('error', (error: Error) => {
        this.logger.error(`Queue publisher connection error: ${(error as Error).message}`);
      });
      connection.on('close', () => {
        this.logger.warn('Queue publisher connection closed, scheduling reconnect');
        this.channel = null;
        this.connection = null;
        this.scheduleReconnect();
      });

      const channel = await connection.createChannel();
      channel.on('error', (error: Error) => {
        this.logger.error(`Queue publisher channel error: ${(error as Error).message}`);
      });
      channel.on('close', () => {
        this.logger.warn('Queue publisher channel closed');
        this.channel = null;
      });
      this.connection = connection;
      this.channel = channel;

      this.logger.log('Queue publisher connected');
    } catch (error) {
      this.logger.error(`Queue publisher connect failed: ${(error as Error).message}`);
      this.scheduleReconnect();
    } finally {
      this.isConnecting = false;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const retryDelayMs = Number(process.env.RABBITMQ_RETRY_DELAY || 5000);
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      await this.connect();
    }, retryDelayMs);
  }

  /** Wait until the publisher channel is ready (used before publish / outbox poll). */
  async ensureChannel(maxAttempts = 24, delayMs = 500): Promise<amqp.Channel> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (this.channel) return this.channel;
      if (!this.isConnecting && !this.reconnectTimer) {
        await this.connect();
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    throw new Error('Queue publisher channel is not connected');
  }

  isConnected(): boolean {
    return this.channel !== null;
  }

  async publish(
    exchange: string,
    routingKey: string,
    payload: unknown,
    options?: amqp.Options.Publish,
  ): Promise<void> {
    const channel = await this.ensureChannel();
    await channel.assertExchange(exchange, 'topic', { durable: true });
    const message = Buffer.from(JSON.stringify(payload));
    const ids = defaultPublishIds(options);
    channel.publish(exchange, routingKey, message, {
      persistent: true,
      contentType: 'application/json',
      timestamp: Date.now(),
      ...ids,
    });
  }

  async sendToQueue(
    queue: string,
    payload: unknown,
    options?: amqp.Options.Publish,
  ): Promise<void> {
    const channel = await this.ensureChannel();
    const message = Buffer.from(JSON.stringify(payload));
    const ids = defaultPublishIds(options);
    channel.sendToQueue(queue, message, {
      persistent: true,
      contentType: 'application/json',
      ...ids,
    });
  }

  /**
   * Inspect RabbitMQ queue depths for the admin jobs console (NL-BUG-SYS-001).
   * Returns one row per monitored queue — not individual message bodies.
   *
   * Uses a short-lived channel per check so a missing queue (RabbitMQ 404) cannot
   * close the shared publish channel.
   */
  async inspectQueues(
    queueNames: string[] = [
      QUEUE_EMAIL,
      QUEUE_NOTIFICATION,
      QUEUE_AUDIT,
      QUEUE_MEDIA,
      QUEUE_WEBHOOK,
      QUEUE_CDN,
      QUEUE_ANALYTICS,
      QUEUE_DOCUMENT,
      QUEUE_EXPORT,
      'payments.webhook.queue',
      'system.webhook.queue',
      'projects.lifecycle.queue',
    ],
  ): Promise<
    Array<{
      name: string;
      messages: number;
      consumers: number;
    }>
  > {
    await this.ensureChannel();
    if (!this.connection) {
      return queueNames.map((name) => ({ name, messages: 0, consumers: 0 }));
    }

    const rows: Array<{ name: string; messages: number; consumers: number }> = [];
    for (const name of queueNames) {
      let probe: amqp.Channel | null = null;
      try {
        const channel = await this.connection.createChannel();
        probe = channel;
        channel.on('error', () => {
          /* expected when checkQueue hits a missing queue */
        });
        const info = await channel.checkQueue(name);
        rows.push({
          name,
          messages: info.messageCount,
          consumers: info.consumerCount,
        });
      } catch {
        rows.push({ name, messages: 0, consumers: 0 });
      } finally {
        try {
          await probe?.close();
        } catch {
          /* channel may already be closed after a 404 checkQueue */
        }
      }
    }
    return rows;
  }
}
