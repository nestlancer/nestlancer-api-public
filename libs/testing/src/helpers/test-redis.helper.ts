import { Redis } from 'ioredis';

let redisClient: Redis | null = null;

/**
 * Set up the test Redis client.
 */
export async function setupTestRedis(): Promise<Redis> {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });

  return redisClient;
}

/**
 * Tear down the test Redis client.
 */
export async function teardownTestRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

/**
 * Flush all data from the test Redis instance.
 */
export async function resetTestRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.flushall();
  }
}

/**
 * Get the current test Redis client instance.
 */
export function getTestRedisClient(): Redis | null {
  return redisClient;
}
