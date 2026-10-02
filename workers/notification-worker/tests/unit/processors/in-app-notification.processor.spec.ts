import { Test, TestingModule } from '@nestjs/testing';
import { InAppNotificationProcessor } from '../../../src/processors/in-app-notification.processor';
import { PrismaWriteService } from '@nestlancer/database';
import { NotificationMetricsService } from '../../../src/services/notification-metrics.service';
import { RedisPublisherService } from '../../../src/services/redis-publisher.service';
import { Logger } from '@nestjs/common';
import { NotificationJob } from '../../../src/interfaces/notification-job.interface';

describe('InAppNotificationProcessor', () => {
  let processor: InAppNotificationProcessor;
  let prismaWrite: jest.Mocked<PrismaWriteService>;
  let redisPublisher: jest.Mocked<RedisPublisherService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InAppNotificationProcessor,
        {
          provide: PrismaWriteService,
          useValue: {
            notification: {
              create: jest.fn(),
              findUnique: jest.fn().mockResolvedValue(null),
              count: jest.fn().mockResolvedValue(1),
            },
          },
        },
        {
          provide: RedisPublisherService,
          useValue: { publish: jest.fn() },
        },
        {
          provide: NotificationMetricsService,
          useValue: { recordCreated: jest.fn() },
        },
      ],
    }).compile();

    processor = module.get<InAppNotificationProcessor>(InAppNotificationProcessor);
    prismaWrite = module.get(PrismaWriteService);
    redisPublisher = module.get(RedisPublisherService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    it('should create notification in DB and publish to redis', async () => {
      const createdNotification = { id: 'notif1', userId: 'user1' };
      prismaWrite.notification.create.mockResolvedValue(createdNotification as any);
      redisPublisher.publish.mockResolvedValue(1);

      const job: NotificationJob = {
        userId: 'user1',
        type: 'MESSAGE_RECEIVED',
        priority: 'HIGH',
        channels: ['IN_APP'],
        notification: {
          title: 'New Message',
          message: 'Hello',
          data: { id: 1 },
          actionUrl: '/messages/1',
        },
      };

      await processor.process(job);

      expect(prismaWrite.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user1',
          type: 'MESSAGE_RECEIVED',
          title: 'New Message',
          message: 'Hello',
          data: { id: 1 },
          actionUrl: '/messages/1',
          priority: 'HIGH',
          channels: ['IN_APP'],
        }),
      });
      expect(redisPublisher.publish).toHaveBeenCalledWith(
        'user:user1',
        'notification.new',
        createdNotification,
      );
      expect(redisPublisher.publish).toHaveBeenCalledWith('user:user1', 'unreadCount.updated', {
        unread: 1,
      });
    });

    it('should handle errors and rethrow', async () => {
      prismaWrite.notification.create.mockRejectedValue(new Error('DB Error'));
      const job: NotificationJob = { userId: 'user1', type: 'TEST', notification: {} as any };

      await expect(processor.process(job)).rejects.toThrow('DB Error');
    });
  });
});
