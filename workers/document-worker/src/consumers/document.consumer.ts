import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueConsumerService } from '@nestlancer/queue';
import { DocumentProcessorService } from '../services/document-processor.service';

@Injectable()
export class DocumentConsumer implements OnModuleInit {
  private readonly logger = new Logger(DocumentConsumer.name);

  constructor(
    private readonly queueConsumer: QueueConsumerService,
    private readonly processor: DocumentProcessorService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const queueName =
      this.configService.get<string>('documentWorker.rabbitmq.queue') || 'document.queue';
    this.logger.log(`Starting document consumer on queue: ${queueName}`);

    await this.queueConsumer.consume(queueName, async (msg) => {
      const routingKey = msg.fields.routingKey;
      try {
        const raw = JSON.parse(msg.content.toString());
        this.logger.debug(`[DocumentConsumer] event=${routingKey}`);
        await this.processor.process(routingKey, raw);
      } catch (error: any) {
        this.logger.error(`[DocumentConsumer] Failed: ${error.message}`, error.stack);
        throw error;
      }
    });
  }
}
