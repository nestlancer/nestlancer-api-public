import { Injectable, OnModuleInit, Logger } from '@nestjs/common';

import { ConsumeMessage } from 'amqplib';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { LoggerService } from '@nestlancer/logger';
import { QueueConsumerService, DlqService } from '@nestlancer/queue';

import { ProcessMediaDto } from '../dto/media-job.dto';
import { MediaWorkerService } from '../services/media-worker.service';

@Injectable()
export class MediaConsumer implements OnModuleInit {
  private readonly logger = new Logger(MediaConsumer.name);
  private readonly queueName = 'media_processing_queue';

  constructor(
    private readonly mediaWorkerService: MediaWorkerService,
    private readonly queueConsumer: QueueConsumerService,
    private readonly loggerService: LoggerService,
    private readonly dlqService: DlqService,
  ) {}

  async onModuleInit() {
    this.loggerService.log('Initializing MediaConsumer...');
    await this.queueConsumer.consume(this.queueName, async (msg) => this.handleMessage(msg));
  }

  private async handleMessage(msg: ConsumeMessage): Promise<void> {
    if (!msg) return;

    try {
      const rawData = JSON.parse(msg.content.toString());
      const jobDto = plainToInstance(ProcessMediaDto, rawData);
      const errors = await validate(jobDto);

      if (errors.length > 0) {
        this.loggerService.error(
          `Validation failed for media job: ${JSON.stringify(errors.map((e) => e.constraints))}`,
        );
        return; // Skip malformed messages
      }

      await this.mediaWorkerService.processJob(jobDto);
    } catch (error: any) {
      this.loggerService.error(`Error processing media message: ${error.message}`);

      // Send to DLQ
      try {
        await this.dlqService.sendToDlq(this.queueName, msg.content.toString(), error.message);
      } catch (dlqError: any) {
        this.loggerService.error(
          `[MediaConsumer] Critical: Failed to send to DLQ: ${dlqError.message}`,
        );
      }

      throw error; // Let QueueConsumerService handle nack
    }
  }
}
