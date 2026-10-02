import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import Redis from 'ioredis';

import { NotificationMetricsService } from './notification-metrics.service';

@Injectable()
export class RedisPublisherService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisPublisherService.name);
  private readonly publisher: Redis;
  private readonly prefix: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly metrics: NotificationMetricsService,
  ) {
    this.publisher = new Redis({
      host:
        process.env.NOTIFICATION_WORKER_REDIS_HOST ||
        this.configService.get('notificationWorker.redis.host') ||
        '100.103.64.83',
      port: Number(
        process.env.NOTIFICATION_WORKER_REDIS_PORT ||
          this.configService.get('notificationWorker.redis.port') ||
          6380,
      ),
      password:
        process.env.NOTIFICATION_WORKER_REDIS_PASSWORD ||
        this.configService.get('notificationWorker.redis.password'),
      family: 4,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
    this.publisher.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`);
    });
    this.prefix = this.configService.get('notificationWorker.redis.pubsubPrefix') || 'ws:';
  }

  async publish(channel: string, event: string, data: any): Promise<void> {
    const fullChannel = `${this.prefix}${channel}`;
    const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
    const started = Date.now();
    await this.publisher.publish(fullChannel, payload);
    this.metrics.recordWsPublishLatency(event, (Date.now() - started) / 1000);
    this.logger.debug(`Published to Redis channel ${fullChannel}: ${event}`);
  }

  onModuleDestroy() {
    this.publisher.disconnect();
  }
}
