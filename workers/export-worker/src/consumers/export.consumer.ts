import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueConsumerService } from '@nestlancer/queue';
import { ExportProcessorService } from '../services/export-processor.service';

@Injectable()
export class ExportConsumer implements OnModuleInit {
  private readonly logger = new Logger(ExportConsumer.name);

  constructor(
    private readonly queueConsumer: QueueConsumerService,
    private readonly processor: ExportProcessorService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const queueName =
      this.configService.get<string>('exportWorker.rabbitmq.queue') || 'export.queue';
    this.logger.log(`Starting export consumer on queue: ${queueName}`);

    await this.queueConsumer.consume(queueName, async (msg) => {
      const routingKey = msg.fields.routingKey;
      try {
        const raw = JSON.parse(msg.content.toString());
        await this.processor.process(routingKey, raw);
      } catch (error: any) {
        this.logger.error(`[ExportConsumer] Failed: ${error.message}`, error.stack);
        throw error;
      }
    });
  }
}
