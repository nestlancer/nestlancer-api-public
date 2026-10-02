import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import Redis from 'ioredis';
import { MESSAGING_CHAT_REDIS_CHANNEL } from '@nestlancer/common';
import { NestlancerConfigService } from '@nestlancer/config';
import { NotificationGateway } from '../gateways/notification.gateway';
import { MessagingGateway } from '../gateways/messaging.gateway';

const REDIS_CHANNEL_PREFIX = 'ws:';
const REDIS_PATTERN = 'ws:user:*';

@Injectable()
export class RedisSubscriberService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisSubscriberService.name);
  private subscriber: Redis | null = null;
  private messagingChatSubscriber: Redis | null = null;

  constructor(
    private readonly configService: NestlancerConfigService,
    private readonly moduleRef: ModuleRef,
  ) {}

  async onModuleInit() {
    const redisUrl = this.configService.redisPubSubUrl;
    this.subscriber = new Redis(redisUrl);
    this.subscriber.on('error', (err) =>
      this.logger.error(`Redis subscriber error: ${err.message}`),
    );

    this.subscriber.psubscribe(REDIS_PATTERN);
    this.subscriber.on('pmessage', (pattern, channel, message) =>
      this.handlePMessage(channel, message),
    );
    this.logger.log(`Subscribed to Redis pattern ${REDIS_PATTERN}`);
  }

  /**
   * After HTTP listen so Socket.IO servers are bound; consumes REST-saved chat messages from messaging.
   */
  async subscribeMessagingChatChannel(): Promise<void> {
    if (this.messagingChatSubscriber) return;

    const redisUrl = this.configService.redisPubSubUrl;
    this.messagingChatSubscriber = new Redis(redisUrl);
    this.messagingChatSubscriber.on('error', (err) =>
      this.logger.error(`Redis messaging-chat subscriber error: ${err.message}`),
    );
    await this.messagingChatSubscriber.subscribe(MESSAGING_CHAT_REDIS_CHANNEL);
    this.messagingChatSubscriber.on('message', (channel, message) => {
      if (channel !== MESSAGING_CHAT_REDIS_CHANNEL) return;
      void this.handleMessagingChatMessage(message);
    });
    this.logger.log(`Subscribed to Redis channel ${MESSAGING_CHAT_REDIS_CHANNEL}`);
  }

  onModuleDestroy() {
    if (this.subscriber) {
      this.subscriber.disconnect();
      this.subscriber = null;
      this.logger.log('Redis subscriber disconnected');
    }
    if (this.messagingChatSubscriber) {
      this.messagingChatSubscriber.disconnect();
      this.messagingChatSubscriber = null;
      this.logger.log('Redis messaging-chat subscriber disconnected');
    }
  }

  private async handlePMessage(channel: string, message: string): Promise<void> {
    try {
      const userId = channel.startsWith(REDIS_CHANNEL_PREFIX + 'user:')
        ? channel.slice((REDIS_CHANNEL_PREFIX + 'user:').length)
        : null;
      if (!userId) return;

      const payload = JSON.parse(message) as { event?: string; data?: unknown; timestamp?: string };
      const event = payload?.event ?? 'notification:new';
      const data = payload?.data ?? payload;

      const notificationGateway = this.moduleRef.get(NotificationGateway, { strict: false });
      if (notificationGateway) {
        notificationGateway.emitToUser(userId, event, data);
      }
    } catch (error: any) {
      this.logger.warn(`Failed to handle Redis message on ${channel}: ${(error as Error).message}`);
    }
  }

  private async handleMessagingChatMessage(message: string): Promise<void> {
    try {
      const parsed = JSON.parse(message) as {
        projectId?: string | null;
        threadId?: string | null;
        id?: string;
        senderId?: string;
        content?: string;
        type?: string;
        createdAt?: string;
      };
      if (!parsed?.id || !parsed?.senderId) return;

      const messagingGateway = this.moduleRef.get(MessagingGateway, { strict: false });
      if (!messagingGateway) return;

      messagingGateway.emitRealtimeMessageFromRest({
        projectId: parsed.projectId ?? null,
        threadId: parsed.threadId ?? null,
        id: parsed.id,
        senderId: parsed.senderId,
        content: parsed.content ?? '',
        type: parsed.type ?? 'TEXT',
        createdAt: parsed.createdAt ?? new Date().toISOString(),
      });
    } catch (error: any) {
      this.logger.warn(
        `Failed to handle messaging chat Redis payload: ${(error as Error).message}`,
      );
    }
  }
}
