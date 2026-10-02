import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { ConsumeMessage } from 'amqplib';

import { EXCHANGE_EVENTS } from '@nestlancer/common';
import { getEventsExchange, PROJECTS_LIFECYCLE_BINDINGS } from '@nestlancer/outbox';
import { QueueConsumerService } from '@nestlancer/queue';

import { PaymentCompletedEventDto } from '../dto/payment-completed-event.dto';
import { QuoteAcceptedEventDto } from '../dto/quote-accepted-event.dto';
import { ProjectFromQuoteService } from '../services/project-from-quote.service';
import { ProjectLifecycleService } from '../services/project-lifecycle.service';
import { ProjectDuplicationService } from '../services/project-duplication.service';

const LIFECYCLE_QUEUE = 'projects.lifecycle.queue';

const PAYMENT_ROUTING_KEYS = new Set(['payment.payment.completed', 'PAYMENT_COMPLETED']);
const QUOTE_ROUTING_KEYS = new Set(['quote.quote.accepted', 'QUOTE_ACCEPTED']);
const DUPLICATION_ROUTING_KEYS = new Set([
  'project.duplication.requested',
  'PROJECT_DUPLICATION_REQUESTED',
]);

@Injectable()
export class ProjectLifecycleConsumer implements OnModuleInit {
  private readonly logger = new Logger(ProjectLifecycleConsumer.name);

  constructor(
    private readonly queueConsumer: QueueConsumerService,
    private readonly projectFromQuote: ProjectFromQuoteService,
    private readonly projectLifecycle: ProjectLifecycleService,
    private readonly projectDuplication: ProjectDuplicationService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const quoteEnabled =
      this.configService.get<string>('PROJECTS_CONSUME_QUOTE_ACCEPTED') !== 'false';
    const paymentEnabled =
      this.configService.get<string>('PROJECTS_CONSUME_PAYMENT_COMPLETED') !== 'false';

    const duplicationEnabled =
      this.configService.get<string>('PROJECTS_CONSUME_DUPLICATION') !== 'false';

    if (!quoteEnabled && !paymentEnabled && !duplicationEnabled) {
      this.logger.warn('ProjectLifecycleConsumer disabled (all consume flags are false)');
      return;
    }

    await this.waitForChannel();
    await this.setupQueueBindings();

    const queue =
      this.configService.get<string>('projects.rabbitmq.lifecycleQueue') ?? LIFECYCLE_QUEUE;

    this.logger.log(
      `Starting ProjectLifecycle consumer on queue: ${queue} (quote=${quoteEnabled}, payment=${paymentEnabled}, duplication=${duplicationEnabled})`,
    );

    await this.queueConsumer.consume(queue, async (msg) => {
      await this.handleMessage(msg, { quoteEnabled, paymentEnabled, duplicationEnabled });
    });
  }

  private async handleMessage(
    msg: ConsumeMessage,
    flags: { quoteEnabled: boolean; paymentEnabled: boolean; duplicationEnabled: boolean },
  ): Promise<void> {
    const content = msg.content.toString();
    const routingKey = msg.fields.routingKey ?? '';

    try {
      const raw = JSON.parse(content);

      if (flags.duplicationEnabled && DUPLICATION_ROUTING_KEYS.has(routingKey)) {
        await this.handleProjectDuplication(content, raw);
        return;
      }

      if (flags.paymentEnabled && PAYMENT_ROUTING_KEYS.has(routingKey)) {
        await this.handlePaymentCompleted(content, raw);
        return;
      }

      if (flags.quoteEnabled && QUOTE_ROUTING_KEYS.has(routingKey)) {
        await this.handleQuoteAccepted(content, raw);
        return;
      }

      this.logger.debug(`Ignoring lifecycle message with routing key: ${routingKey}`);
    } catch (error: unknown) {
      this.logger.error(`Error processing lifecycle message (${routingKey}): ${content}`, error);
      throw error;
    }
  }

  private async handleQuoteAccepted(content: string, raw: unknown): Promise<void> {
    const dto = plainToInstance(QuoteAcceptedEventDto, raw);
    const errors = await validate(dto);

    if (errors.length > 0) {
      const validationErrors = errors
        .map((err) => Object.values(err.constraints || {}).join(', '))
        .join('; ');
      this.logger.error(
        `Invalid QUOTE_ACCEPTED payload: ${validationErrors} | Content: ${content}`,
      );
      throw new Error(`Invalid QUOTE_ACCEPTED payload: ${validationErrors}`);
    }

    await this.projectFromQuote.createFromAcceptedQuote(dto);
  }

  private async handlePaymentCompleted(content: string, raw: unknown): Promise<void> {
    const dto = plainToInstance(PaymentCompletedEventDto, raw);
    const errors = await validate(dto);

    if (errors.length > 0) {
      const validationErrors = errors
        .map((err) => Object.values(err.constraints || {}).join(', '))
        .join('; ');
      this.logger.error(
        `Invalid PAYMENT_COMPLETED payload: ${validationErrors} | Content: ${content}`,
      );
      return;
    }

    await this.projectLifecycle.handlePaymentCompleted(dto);
  }

  private async handleProjectDuplication(content: string, raw: unknown): Promise<void> {
    const payload = raw as Record<string, unknown>;
    const jobId = String(payload.jobId || '');
    const projectId = String(payload.projectId || '');
    if (!jobId || !projectId) {
      this.logger.error(`Invalid PROJECT_DUPLICATION_REQUESTED payload: ${content}`);
      return;
    }

    await this.projectDuplication.duplicateFromEvent({
      jobId,
      projectId,
      requestedByUserId: payload.requestedByUserId ? String(payload.requestedByUserId) : undefined,
      title: payload.title ? String(payload.title) : undefined,
      clientId: payload.clientId ? String(payload.clientId) : undefined,
    });
  }

  private async waitForChannel(maxAttempts = 20, delayMs = 500): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.queueConsumer.getChannel();
        return;
      } catch {
        if (attempt === maxAttempts) {
          throw new Error('Queue consumer channel not available after retries');
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  private async setupQueueBindings(): Promise<void> {
    const channel = this.queueConsumer.getChannel();
    const queue =
      this.configService.get<string>('projects.rabbitmq.lifecycleQueue') ?? LIFECYCLE_QUEUE;
    const exchange = getEventsExchange();
    const legacyExchange =
      this.configService.get<string>('RABBITMQ_EXCHANGE_EVENTS') === 'events' ? 'events' : null;
    const exchanges =
      legacyExchange && legacyExchange !== exchange ? [exchange, legacyExchange] : [exchange];

    for (const ex of exchanges) {
      await channel.assertExchange(ex, 'topic', { durable: true });
    }
    await channel.assertQueue(queue, { durable: true });
    for (const ex of exchanges) {
      for (const key of PROJECTS_LIFECYCLE_BINDINGS) {
        await channel.bindQueue(queue, ex, key);
      }
    }

    this.logger.log(
      `Bound ${queue} to [${exchanges.join(', ')}] (${PROJECTS_LIFECYCLE_BINDINGS.length} keys each)`,
    );
  }
}
