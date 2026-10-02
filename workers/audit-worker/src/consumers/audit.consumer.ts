import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ConsumeMessage } from 'amqplib';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { QueueConsumerService, DlqService } from '@nestlancer/queue';

import { AuditEntryDto } from '../dto/audit-entry.dto';
import { AuditWorkerService } from '../services/audit-worker.service';

/**
 * RabbitMQ consumer for audit log events.
 * Listens for system events and forwards them to the AuditWorkerService for batch processing.
 */
@Injectable()
export class AuditConsumer implements OnModuleInit {
  private readonly logger = new Logger(AuditConsumer.name);
  private readonly queueName: string;

  constructor(
    private readonly auditWorkerService: AuditWorkerService,
    private readonly queueConsumer: QueueConsumerService,
    private readonly configService: ConfigService,
    private readonly dlqService: DlqService,
  ) {
    this.queueName = this.configService.get<string>('audit.queueName', 'audit.queue');
  }

  /**
   * Initializes the consumer by registering the audit queue handler.
   */
  async onModuleInit(): Promise<void> {
    this.logger.log(`[AuditConsumer] Subscribing to queue: ${this.queueName}`);
    await this.queueConsumer.consume(this.queueName, async (msg: ConsumeMessage) =>
      this.handleMessage(msg),
    );
  }

  /**
   * Parses and hands off the audit entry to the processing service.
   *
   * @param msg - The RabbitMQ message containing the audit entry JSON
   * @throws Error if the message cannot be processed, allowing the consumer to handle retries
   */
  private async handleMessage(msg: ConsumeMessage): Promise<void> {
    try {
      const content = msg.content.toString();
      const rawEntry = JSON.parse(content);

      // Transform and validate
      const entryDto = plainToInstance(AuditEntryDto, rawEntry);
      const errors = await validate(entryDto);

      if (errors.length > 0) {
        this.logger.error(
          `[AuditConsumer] Validation failed for message: ${JSON.stringify(errors.map((e) => e.constraints))}`,
        );
        // We acknowledge the message to remove it from queue if it's invalid
        // or let it fail if we want to DLX it.
        // For now, we throw to ensure the queue consumer logic handles it.
        throw new Error('Validation failed');
      }

      await this.auditWorkerService.handleAuditEntry(entryDto);
    } catch (error: any) {
      this.logger.error(
        `[AuditConsumer] Failed to process audit message: ${error.message}`,
        error.stack,
      );

      // Send to DLQ
      try {
        await this.dlqService.sendToDlq(this.queueName, msg.content.toString(), error.message);
      } catch (dlqError: any) {
        this.logger.error(`[AuditConsumer] Critical: Failed to send to DLQ: ${dlqError.message}`);
      }

      // We throw to let the QueueConsumerService nack the message.
      // Since it nacks with requeue=false, the message is removed from the original queue.
      throw error;
    }
  }
}
