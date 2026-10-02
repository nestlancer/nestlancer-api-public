import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client!: Redis;

  constructor(@Inject('CACHE_OPTIONS') private readonly options: { redisUrl?: string }) {}

  async onModuleInit(): Promise<void> {
    const redisUrl =
      this.options.redisUrl ||
      process.env.REDIS_CACHE_URL ||
      process.env.REDIS_URL ||
      'redis://localhost:6379';
    this.client = new Redis(redisUrl);
    this.client.on('error', (err) => this.logger.error('Redis error:', err));
    this.logger.log('Cache service connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.quit();
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  /** SET key value EX ttl NX. Returns false when the key already exists. */
  async setIfAbsent(key: string, value: unknown, ttlSeconds: number): Promise<boolean> {
    const result = await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }

  async invalidateByTag(tag: string): Promise<void> {
    const keys = await this.client.smembers(`tag:${tag}`);
    if (keys.length > 0) {
      await this.client.del(...keys);
      await this.client.del(`tag:${tag}`);
    }
  }

  async tagKey(key: string, tags: string[]): Promise<void> {
    for (const tag of tags) {
      await this.client.sadd(`tag:${tag}`, key);
    }
  }

  getClient(): Redis {
    return this.client;
  }
}
