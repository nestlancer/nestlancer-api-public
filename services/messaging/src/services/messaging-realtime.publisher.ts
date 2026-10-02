import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { NestlancerConfigService } from '@nestlancer/config';
import { MESSAGING_CHAT_REDIS_CHANNEL } from '@nestlancer/common';
import Redis from 'ioredis';

export interface ChatMessageRealtimePayload {
  id: string;
  projectId: string | null;
  threadId: string | null;
  senderId: string;
  content: string;
  type: string;
  createdAt: string;
}

/**
 * Publishes saved chat messages to {@link MESSAGING_CHAT_REDIS_CHANNEL} on the
 * **pub/sub** Redis URL (same instance ws-gateway subscribes to), not cache Redis.
 */
@Injectable()
export class MessagingRealtimePublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessagingRealtimePublisher.name);
  private publisher: Redis | null = null;

  constructor(private readonly config: NestlancerConfigService) {}

  async onModuleInit(): Promise<void> {
    const redisUrl = this.config.redisPubSubUrl;
    this.publisher = new Redis(redisUrl);
    this.publisher.on('error', (err) =>
      this.logger.error(`Messaging realtime Redis error: ${err.message}`),
    );
    try {
      await this.publisher.ping();
      this.logger.log(`Messaging realtime publisher connected (${redisUrl})`);
    } catch (err: unknown) {
      this.logger.warn(
        `Messaging realtime publisher could not ping Redis: ${(err as Error)?.message ?? err}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.publisher?.quit();
    this.publisher = null;
  }

  publish(payload: ChatMessageRealtimePayload): void {
    if (!this.publisher) {
      this.logger.warn('Realtime publisher not ready; skipping chat broadcast');
      return;
    }
    void this.publisher
      .publish(MESSAGING_CHAT_REDIS_CHANNEL, JSON.stringify(payload))
      .catch((err: Error) => this.logger.warn(`Chat realtime publish failed: ${err.message}`));
  }
}
