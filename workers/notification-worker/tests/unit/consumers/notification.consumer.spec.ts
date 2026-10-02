import { Test, TestingModule } from '@nestjs/testing';
import { NotificationConsumer } from '../../../src/consumers/notification.consumer';
import { DlqService, QueueConsumerService } from '@nestlancer/queue';
import { NotificationBroadcastProcessor } from '../../../src/services/notification-broadcast.processor';
import { NotificationDispatcherService } from '../../../src/services/notification-dispatcher.service';
import { NotificationMetricsService } from '../../../src/services/notification-metrics.service';
import { NotificationWorkerService } from '../../../src/services/notification-worker.service';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel, NotificationJobType } from '@nestlancer/common';

describe('NotificationConsumer', () => {
  let consumer: NotificationConsumer;
  let queueConsumerService: jest.Mocked<QueueConsumerService>;
  let notificationWorkerService: jest.Mocked<NotificationWorkerService>;
  let dispatcher: jest.Mocked<NotificationDispatcherService>;
  let dlqService: jest.Mocked<DlqService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationConsumer,
        {
          provide: QueueConsumerService,
          useValue: { consume: jest.fn() },
        },
        {
          provide: NotificationWorkerService,
          useValue: { processNotification: jest.fn() },
        },
        {
          provide: NotificationDispatcherService,
          useValue: { dispatch: jest.fn() },
        },
        {
          provide: NotificationBroadcastProcessor,
          useValue: { canHandle: jest.fn().mockReturnValue(false), process: jest.fn() },
        },
        {
          provide: DlqService,
          useValue: { sendToDlq: jest.fn() },
        },
        {
          provide: NotificationMetricsService,
          useValue: { recordDlq: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    consumer = module.get<NotificationConsumer>(NotificationConsumer);
    queueConsumerService = module.get(QueueConsumerService);
    notificationWorkerService = module.get(NotificationWorkerService);
    dispatcher = module.get(NotificationDispatcherService);
    dlqService = module.get(DlqService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should start consuming from the configured queue', async () => {
      const queueName = 'test.notification.queue';
      configService.get.mockReturnValue(queueName);

      await consumer.onModuleInit();

      expect(queueConsumerService.consume).toHaveBeenCalledWith(queueName, expect.any(Function));
    });

    it('should process valid NotificationJob messages directly', async () => {
      configService.get.mockReturnValue('test.queue');
      let messageHandler: (msg: any) => Promise<void>;
      queueConsumerService.consume.mockImplementation(async (queue, handler) => {
        messageHandler = handler;
      });

      await consumer.onModuleInit();

      const mockJob = {
        userId: 'user-1',
        type: NotificationJobType.IN_APP,
        channels: [NotificationChannel.IN_APP],
        notification: { title: 'Test', message: 'Body' },
      };
      const mockMsg = {
        content: Buffer.from(JSON.stringify(mockJob)),
        fields: { routingKey: 'notification.new' },
      };

      await messageHandler!(mockMsg);

      expect(notificationWorkerService.processNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1' }),
      );
      expect(dispatcher.dispatch).not.toHaveBeenCalled();
    });

    it('should dispatch domain events through the mapper', async () => {
      configService.get.mockReturnValue('test.queue');
      let messageHandler: (msg: any) => Promise<void>;
      queueConsumerService.consume.mockImplementation(async (queue, handler) => {
        messageHandler = handler;
      });

      await consumer.onModuleInit();

      const rawOutbox = { quoteId: 'q-1', userId: 'user-1' };
      const mockMsg = {
        content: Buffer.from(JSON.stringify(rawOutbox)),
        fields: { routingKey: 'quote.quote.sent' },
      };

      await messageHandler!(mockMsg);

      expect(dispatcher.dispatch).toHaveBeenCalledWith('quote.quote.sent', rawOutbox);
      expect(notificationWorkerService.processNotification).not.toHaveBeenCalled();
    });
  });
});
