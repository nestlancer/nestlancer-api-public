import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import Redis from 'ioredis';

/**
 * Redis-based leader election service.
 * Ensures that only one worker instance performs background tasks (like polling).
 * Uses atomic Redis SET NX with TTL to manage the distributed lock.
 */
@Injectable()
export class LeaderElectionService implements OnApplicationShutdown {
  private readonly logger = new Logger(LeaderElectionService.name);
  private readonly redis: Redis;
  private readonly lockKey: string;
  private readonly lockTtl: number;
  private readonly instanceId: string;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_CACHE_URL') || '';
    this.redis = new Redis(redisUrl);
    this.lockKey = this.configService.get<string>('outbox.leaderLockKey') || 'outbox:lock';
    this.lockTtl = this.configService.get<number>('outbox.lockTtlSeconds') || 10;
    this.instanceId = this.configService.get<string>('outbox.instanceId') || 'unknown';
  }

  /**
   * Attempts to acquire the leadership lock for this instance.
   * If the lock is already held by this instance, it renews the TTL.
   *
   * @returns A promise resolving to true if this instance is now the leader
   */
  async acquireLock(): Promise<boolean> {
    try {
      const result = await this.redis.set(this.lockKey, this.instanceId, 'EX', this.lockTtl, 'NX');

      if (result === 'OK') {
        this.logger.debug(
          `[LeaderElection] Instance ${this.instanceId} successfully acquired leadership lock.`,
        );
        return true;
      }

      // Renew TTL if lock is already held by this instance (avoiding race conditions)
      const currentValue = await this.redis.get(this.lockKey);
      if (currentValue === this.instanceId) {
        await this.redis.expire(this.lockKey, this.lockTtl);
        return true;
      }

      return false;
    } catch (e: any) {
      const error = e as Error;
      this.logger.error(
        `[LeaderElection] Failed to acquire lock in Redis: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Releases the leadership lock if it's currently held by this instance.
   *
   * @returns A promise that resolves when the release operation is finished
   */
  async releaseLock(): Promise<void> {
    try {
      const currentValue = await this.redis.get(this.lockKey);
      if (currentValue === this.instanceId) {
        await this.redis.del(this.lockKey);
        this.logger.debug(
          `[LeaderElection] Instance ${this.instanceId} released the leadership lock.`,
        );
      }
    } catch (e: any) {
      const error = e as Error;
      this.logger.error(`[LeaderElection] Failed to release lock: ${error.message}`, error.stack);
    }
  }

  /**
   * Checks if this instance is currently the leader based on the lock in Redis.
   *
   * @returns A promise resolving to true if this instance holds the lock
   */
  async isLeader(): Promise<boolean> {
    const val = await this.redis.get(this.lockKey);
    return val === this.instanceId;
  }

  async onApplicationShutdown(): Promise<void> {
    await this.releaseLock();
  }
}
