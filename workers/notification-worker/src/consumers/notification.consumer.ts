import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ConsumeMessage } from 'amqplib';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { isNotificationJob } from '@nestlancer/notifications';
import { DlqService, QueueConsumerService } from '@nestlancer/queue';

import { NotificationJobDto } from '../dto/notification-job.dto';
import { NotificationBroadcastProcessor } from '../services/notification-broadcast.processor';
import { NotificationDispatcherService } from '../services/notification-dispatcher.service';
import { NotificationMetricsService } from '../services/notification-metrics.service';
import { NotificationWorkerService } from '../services/notification-worker.service';

@Injectable()
export class NotificationConsumer implements OnModuleInit {
  private readonly logger = new Logger(NotificationConsumer.name);

  constructor(
    private readonly queueConsumer: QueueConsumerService,
    private readonly notificationWorkerService: NotificationWorkerService,
    private readonly dispatcher: NotificationDispatcherService,
    private readonly broadcastProcessor: NotificationBroadcastProcessor,
    private readonly dlqService: DlqService,
    private readonly metrics: NotificationMetricsService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const queueName =
      this.configService.get<string>('notification-worker.rabbitmq.queue') || 'notification.queue';
    this.logger.log(`Starting notification consumer on queue: ${queueName}`);

    await this.queueConsumer.consume(queueName, async (msg: ConsumeMessage) => {
      const content = msg.content.toString();
      const routingKey = msg.fields.routingKey;
      let rawJob: unknown;

      try {
        rawJob = JSON.parse(content);

        if (isNotificationJob(rawJob)) {
          const jobDto = plainToInstance(NotificationJobDto, rawJob);
          const errors = await validate(jobDto);
          if (errors.length > 0) {
            const validationErrors = errors
              .map((err) => Object.values(err.constraints || {}).join(', '))
              .join('; ');
            const errorMsg = `Validation failed for notification job: ${validationErrors}`;
            this.logger.error(`${errorMsg} | Content: ${content}`);
            this.metrics.recordDlq(queueName);
            await this.dlqService.sendToDlq(queueName, rawJob, errorMsg);
            return;
          }
          await this.notificationWorkerService.processNotification(jobDto);
          return;
        }

        if (this.broadcastProcessor.canHandle(rawJob, routingKey)) {
          await this.broadcastProcessor.process(rawJob, routingKey);
          return;
        }

        await this.dispatcher.dispatch(routingKey, rawJob);
      } catch (error: any) {
        this.logger.error(
          `Error processing notification message routingKey=${routingKey}: ${content}`,
          error,
        );
        this.metrics.recordDlq(queueName);
        await this.dlqService.sendToDlq(
          queueName,
          rawJob ?? content,
          error?.message || String(error),
        );
      }
    });
  }
}
