import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { QueueConsumerService } from '@nestlancer/queue';

import { EmailDispatcherService } from '../services/email-dispatcher.service';

@Injectable()
export class EmailConsumer implements OnModuleInit {
  private readonly logger = new Logger(EmailConsumer.name);

  constructor(
    private readonly queueConsumer: QueueConsumerService,
    private readonly dispatcher: EmailDispatcherService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const queueName = this.configService.get<string>('emailWorker.rabbitmq.queue') || 'email.queue';
    this.logger.log(`Starting email consumer on queue: ${queueName}`);

    await this.queueConsumer.consume(queueName, async (msg) => {
      const content = msg.content.toString();
      const routingKey = msg.fields.routingKey;
      try {
        const raw = JSON.parse(content);
        this.logger.debug(
          `[EmailConsumer] Received message routingKey=${routingKey} keys=${Object.keys(raw || {}).join(',')}`,
        );
        await this.dispatcher.dispatch(routingKey, raw);
      } catch (error: any) {
        this.logger.error(
          `[EmailConsumer] Catastrophic error processing message: ${content.substring(0, 100)}...`,
          error.stack,
        );
        throw error;
      }
    });
  }
}
