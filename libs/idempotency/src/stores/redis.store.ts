import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisIdempotencyStore {
  private readonly logger = new Logger(RedisIdempotencyStore.name);
  private redis!: Redis;

  constructor() {
    const url = process.env.REDIS_CACHE_URL || 'redis://localhost:6379/0';
    this.redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 3 });
    this.redis.connect().catch((err) => {
      this.logger.warn(`Redis idempotency connection deferred: ${err.message}`);
    });
  }

  private keyPrefix(key: string): string {
    return `idempotency:${key}`;
  }

  async get(key: string): Promise<{ responseCode: number; responseBody: unknown } | null> {
    const data = await this.redis.get(this.keyPrefix(key));
    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch {
      this.logger.warn(`Invalid idempotency data for key: ${key}`);
      return null;
    }
  }

  async set(
    key: string,
    response: { responseCode: number; responseBody: unknown },
    ttlSeconds: number = 86400,
  ): Promise<void> {
    await this.redis.set(this.keyPrefix(key), JSON.stringify(response), 'EX', ttlSeconds);
  }

  async lock(key: string, ttlSeconds: number = 30): Promise<boolean> {
    const lockKey = `${this.keyPrefix(key)}:lock`;
    const result = await this.redis.set(lockKey, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async unlock(key: string): Promise<void> {
    const lockKey = `${this.keyPrefix(key)}:lock`;
    await this.redis.del(lockKey);
  }
}
