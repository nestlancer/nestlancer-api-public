import { randomUUID } from 'crypto';

import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as amqp from 'amqplib';

import {
  normalizeCorrelationId,
  runWithLogContext,
  writeLog,
  type LogContext,
} from '@nestlancer/common';

type ConsumerRegistration = {
  queue: string;
  handler: (msg: amqp.ConsumeMessage) => Promise<void>;
};

function pickId(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (value === undefined || value === null || value === '') continue;
    return String(value);
  }
  return undefined;
}

function contextFromQueueMessage(msg: amqp.ConsumeMessage): LogContext {
  let body: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(msg.content.toString());
    if (parsed && typeof parsed === 'object') body = parsed as Record<string, unknown>;
  } catch {
    body = {};
  }
  const payload =
    body.payload && typeof body.payload === 'object'
      ? (body.payload as Record<string, unknown>)
      : body.data && typeof body.data === 'object'
        ? (body.data as Record<string, unknown>)
        : body;

  const jobId =
    pickId(
      msg.properties?.messageId,
      body.jobId,
      body.id,
      payload.jobId,
      payload.id,
      body.emailId,
      payload.emailId,
      body.notificationId,
      payload.notificationId,
      msg.properties?.correlationId,
    ) || randomUUID();

  const correlationId =
    normalizeCorrelationId(
      msg.properties?.correlationId,
      body.correlationId,
      payload.correlationId,
      jobId,
    ) || jobId;

  return {
    event: 'queue.consume',
    correlationId,
    jobId,
    paymentId: pickId(body.paymentId, payload.paymentId, payload.payment_id),
    userId: pickId(body.userId, payload.userId, payload.user_id, payload.sub),
  };
}

@Injectable()
export class QueueConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueConsumerService.name);
  private connection: any = null;
  private channel: amqp.Channel | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private readonly registrations: ConsumerRegistration[] = [];

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
        this.logger.error(`Queue consumer connection error: ${(error as Error).message}`);
      });
      connection.on('close', () => {
        this.logger.warn('Queue consumer connection closed, scheduling reconnect');
        this.channel = null;
        this.connection = null;
        this.scheduleReconnect();
      });

      const channel = await connection.createChannel();
      channel.on('error', (error: Error) => {
        this.logger.error(`Queue consumer channel error: ${(error as Error).message}`);
      });
      channel.on('close', () => {
        this.logger.warn('Queue consumer channel closed');
        this.channel = null;
      });
      this.connection = connection;
      this.channel = channel;
      await channel.prefetch(1);
      this.logger.log('Queue consumer connected');

      // Re-bind consumers after reconnect so workers keep processing.
      for (const reg of this.registrations) {
        await this.startConsumer(reg.queue, reg.handler);
      }
    } catch (error) {
      this.logger.error(`Queue consumer connect failed: ${(error as Error).message}`);
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

  async consume(
    queue: string,
    handler: (msg: amqp.ConsumeMessage) => Promise<void>,
  ): Promise<void> {
    if (!this.registrations.some((r) => r.queue === queue && r.handler === handler)) {
      this.registrations.push({ queue, handler });
    }
    if (!this.channel) {
      throw new Error('Queue consumer channel is not connected');
    }
    await this.startConsumer(queue, handler);
  }

  private async startConsumer(
    queue: string,
    handler: (msg: amqp.ConsumeMessage) => Promise<void>,
  ): Promise<void> {
    if (!this.channel) return;
    await this.channel.assertQueue(queue, { durable: true });
    await this.channel.consume(queue, async (msg) => {
      if (!msg) return;
      const ctx = contextFromQueueMessage(msg);
      const started = process.hrtime.bigint();
      try {
        await runWithLogContext(ctx, async () => {
          writeLog('info', `queue.consume ${queue}`, {
            context: 'Queue',
            event: 'queue.consume',
            correlationId: ctx.correlationId,
            jobId: ctx.jobId,
            userId: ctx.userId,
            paymentId: ctx.paymentId,
            path: queue,
          });
          await handler(msg);
          const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
          writeLog('info', `queue.consume.ok ${queue} ${durationMs.toFixed(1)}ms`, {
            context: 'Queue',
            event: 'queue.consume.ok',
            correlationId: ctx.correlationId,
            jobId: ctx.jobId,
            userId: ctx.userId,
            paymentId: ctx.paymentId,
            path: queue,
            durationMs: Number(durationMs.toFixed(1)),
            status: 200,
          });
        });
        this.channel?.ack(msg);
      } catch (error) {
        const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
        await runWithLogContext(ctx, async () => {
          writeLog(
            'error',
            `queue.consume.error ${queue}: ${(error as Error).message}`,
            {
              context: 'Queue',
              event: 'queue.consume.error',
              correlationId: ctx.correlationId,
              jobId: ctx.jobId,
              userId: ctx.userId,
              paymentId: ctx.paymentId,
              path: queue,
              durationMs: Number(durationMs.toFixed(1)),
              status: 500,
            },
          );
        });
        this.channel?.nack(msg, false, false);
      }
    });
    this.logger.log(`Consuming queue: ${queue}`);
  }

  getChannel(): amqp.Channel {
    if (!this.channel) {
      throw new Error('Queue consumer channel is not connected');
    }
    return this.channel;
  }
}
