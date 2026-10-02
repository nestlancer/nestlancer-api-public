import {
  setupApp,
  teardownApp,
  getApp,
  getConsumeHandler,
  getRedisPublishMock,
  getPushSendNotificationMock,
  getNotificationCreateMock,
  getUserPushSubscriptionFindManyMock,
  getUserPushSubscriptionDeleteMock,
} from './setup';
import { NotificationConsumer } from '../src/consumers/notification.consumer';
import { NotificationWorkerService } from '../src/services/notification-worker.service';
import { InAppNotificationProcessor } from '../src/processors/in-app-notification.processor';
import { RedisPublisherService } from '../src/services/redis-publisher.service';
import { PushProviderService } from '../src/services/push-provider.service';
import { NotificationChannel, NotificationJobType, type NotificationJob } from '@nestlancer/common';

describe('Notification Worker - E2E', () => {
  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  describe('Health (smoke)', () => {
    it('should bootstrap worker and resolve key services', () => {
      const app = getApp();
      expect(app).toBeDefined();
      expect(app.get(NotificationConsumer)).toBeDefined();
      expect(app.get(NotificationWorkerService)).toBeDefined();
      expect(app.get(InAppNotificationProcessor)).toBeDefined();
      expect(app.get(RedisPublisherService)).toBeDefined();
      expect(app.get(PushProviderService)).toBeDefined();
    });
  });

  describe('NotificationWorkerService - processNotification (E2E)', () => {
    let service: NotificationWorkerService;
    const notificationCreateMock = getNotificationCreateMock();
    const redisPublishMock = getRedisPublishMock();
    const pushSendNotificationMock = getPushSendNotificationMock();
    const findManyPushMock = getUserPushSubscriptionFindManyMock();
    const deletePushMock = getUserPushSubscriptionDeleteMock();

    beforeEach(() => {
      service = getApp().get(NotificationWorkerService);
      notificationCreateMock.mockClear();
      redisPublishMock.mockClear();
      pushSendNotificationMock.mockClear();
      findManyPushMock.mockClear();
      deletePushMock.mockClear();
      notificationCreateMock.mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: 'e2e-notif-1',
          userId: args.data.userId,
          type: args.data.type,
          title: args.data.title,
          message: args.data.message,
          data: args.data.data ?? null,
          actionUrl: args.data.actionUrl ?? null,
          priority: args.data.priority ?? 'NORMAL',
          channels: args.data.channels,
          createdAt: new Date(),
          readAt: null,
        }),
      );
    });

    it('should create in-app notification and publish to Redis with exact channel, event and data when job has IN_APP channel', async () => {
      const userId = 'usr-e2e-inapp-1';
      const job: NotificationJob = {
        type: NotificationJobType.IN_APP,
        userId,
        channels: [NotificationChannel.IN_APP],
        notification: {
          title: 'Project update',
          message: 'Your project was approved',
          actionUrl: '/projects/123',
          data: { projectId: '123' },
        },
        priority: 'HIGH',
      };

      await service.processNotification(job);

      expect(notificationCreateMock).toHaveBeenCalledTimes(1);
      const createCall = notificationCreateMock.mock.calls[0][0];
      expect(createCall.data).toMatchObject({
        userId,
        type: NotificationJobType.IN_APP,
        title: 'Project update',
        message: 'Your project was approved',
        actionUrl: '/projects/123',
        data: { projectId: '123' },
        priority: 'HIGH',
        channels: [NotificationChannel.IN_APP],
      });

      expect(redisPublishMock).toHaveBeenCalledTimes(1);
      const [channel, event, data] = redisPublishMock.mock.calls[0];
      expect(channel).toBe(`user:${userId}`);
      expect(event).toBe('notification.new');
      expect(data).toBeDefined();
      expect(data.id).toBe('e2e-notif-1');
      expect(data.userId).toBe(userId);
      expect(data.title).toBe('Project update');
      expect(data.message).toBe('Your project was approved');
      expect(data.actionUrl).toBe('/projects/123');
    });

    it('should call push provider with subscription and payload when job has PUSH channel and user has subscription', async () => {
      const userId = 'usr-e2e-push-1';
      const subscriptionPayload = {
        endpoint: 'https://push.example.com',
        keys: { p256dh: 'x', auth: 'y' },
      };
      findManyPushMock.mockResolvedValueOnce([
        { id: 'sub-e2e-1', userId, subscription: subscriptionPayload },
      ]);
      pushSendNotificationMock.mockResolvedValue(true);

      const job: NotificationJob = {
        type: NotificationJobType.PUSH,
        userId,
        channels: [NotificationChannel.PUSH],
        notification: {
          title: 'New message',
          message: 'You have a new message',
          actionUrl: '/messages/1',
        },
      };

      await service.processNotification(job);

      expect(findManyPushMock).toHaveBeenCalledWith({ where: { userId } });
      expect(pushSendNotificationMock).toHaveBeenCalledTimes(1);
      const [subscription, payload] = pushSendNotificationMock.mock.calls[0];
      expect(subscription).toEqual(subscriptionPayload);
      expect(payload).toMatchObject({
        title: 'New message',
        body: 'You have a new message',
        data: { url: '/messages/1', type: NotificationJobType.PUSH },
      });
      expect(deletePushMock).not.toHaveBeenCalled();
    });

    it('should delete push subscription when sendNotification returns false (expired/invalid)', async () => {
      const userId = 'usr-e2e-push-invalid';
      const subscriptionPayload = { endpoint: 'https://push.example.com/expired', keys: {} };
      findManyPushMock.mockResolvedValueOnce([
        { id: 'sub-e2e-expired', userId, subscription: subscriptionPayload },
      ]);
      pushSendNotificationMock.mockResolvedValue(false);

      const job: NotificationJob = {
        type: NotificationJobType.PUSH,
        userId,
        channels: [NotificationChannel.PUSH],
        notification: { title: 'Test', message: 'Body' },
      };

      await service.processNotification(job);

      expect(pushSendNotificationMock).toHaveBeenCalledTimes(1);
      expect(deletePushMock).toHaveBeenCalledTimes(1);
      expect(deletePushMock).toHaveBeenCalledWith({ where: { id: 'sub-e2e-expired' } });
    });

    it('should not call push provider when user has no push subscriptions', async () => {
      findManyPushMock.mockResolvedValue([]);
      const job: NotificationJob = {
        type: NotificationJobType.PUSH,
        userId: 'usr-no-subs',
        channels: [NotificationChannel.PUSH],
        notification: { title: 'No one receives', message: 'No subs' },
      };

      await service.processNotification(job);

      expect(findManyPushMock).toHaveBeenCalledWith({ where: { userId: 'usr-no-subs' } });
      expect(pushSendNotificationMock).not.toHaveBeenCalled();
    });

    it('should default to IN_APP when channels is omitted and create notification and publish to Redis', async () => {
      const userId = 'usr-e2e-default';
      const job: NotificationJob = {
        type: NotificationJobType.IN_APP,
        userId,
        notification: { title: 'Default channel', message: 'Uses IN_APP' },
      };

      await service.processNotification(job);

      expect(notificationCreateMock).toHaveBeenCalledTimes(1);
      expect(redisPublishMock).toHaveBeenCalledTimes(1);
      expect(redisPublishMock.mock.calls[0][0]).toBe(`user:${userId}`);
      expect(redisPublishMock.mock.calls[0][1]).toBe('notification.new');
    });
  });

  describe('NotificationConsumer - message handling (E2E)', () => {
    const notificationCreateMock = getNotificationCreateMock();
    const redisPublishMock = getRedisPublishMock();

    beforeEach(() => {
      notificationCreateMock.mockClear();
      redisPublishMock.mockClear();
      notificationCreateMock.mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: 'e2e-consumer-notif-1',
          userId: args.data.userId,
          type: args.data.type,
          title: args.data.title,
          message: args.data.message,
          data: args.data.data ?? null,
          actionUrl: args.data.actionUrl ?? null,
          priority: args.data.priority ?? 'NORMAL',
          channels: args.data.channels,
          createdAt: new Date(),
          readAt: null,
        }),
      );
    });

    it('should parse valid JSON message and process IN_APP job so notification is created and Redis publish is called', async () => {
      const job: NotificationJob = {
        type: NotificationJobType.IN_APP,
        userId: 'usr-consumer-e2e',
        channels: [NotificationChannel.IN_APP],
        notification: {
          title: 'Quote received',
          message: 'The studio sent you a quote',
          actionUrl: '/quotes/456',
        },
      };
      const msg = { content: Buffer.from(JSON.stringify(job)) };

      const handler = getConsumeHandler();
      await handler(msg);

      expect(notificationCreateMock).toHaveBeenCalledTimes(1);
      expect(notificationCreateMock.mock.calls[0][0].data.title).toBe('Quote received');
      expect(notificationCreateMock.mock.calls[0][0].data.message).toBe(
        'The studio sent you a quote',
      );
      expect(redisPublishMock).toHaveBeenCalledTimes(1);
      expect(redisPublishMock.mock.calls[0][0]).toBe('user:usr-consumer-e2e');
      expect(redisPublishMock.mock.calls[0][1]).toBe('notification.new');
      expect(redisPublishMock.mock.calls[0][2].title).toBe('Quote received');
    });

    it('should throw on invalid JSON and not create notification or publish to Redis', async () => {
      const msg = { content: Buffer.from('not valid json {{{') };

      const handler = getConsumeHandler();
      await expect(handler(msg)).rejects.toThrow();

      expect(notificationCreateMock).not.toHaveBeenCalled();
      expect(redisPublishMock).not.toHaveBeenCalled();
    });
  });
});
