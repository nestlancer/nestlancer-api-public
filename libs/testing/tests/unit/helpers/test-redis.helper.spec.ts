import {
  setupTestRedis,
  teardownTestRedis,
  resetTestRedis,
  getTestRedisClient,
} from '../../../src/helpers/test-redis.helper';

// Mock ioredis
jest.mock('ioredis', () => {
  return {
    Redis: jest.fn().mockImplementation(() => {
      return {
        quit: jest.fn().mockResolvedValue('OK'),
        flushall: jest.fn().mockResolvedValue('OK'),
      };
    }),
  };
});

describe('Test Redis Helper', () => {
  afterEach(async () => {
    await teardownTestRedis();
  });

  it('should setup the redis client', async () => {
    const client = await setupTestRedis();
    expect(client).toBeDefined();
    expect(getTestRedisClient()).toBe(client);
  });

  it('should teardown the redis client', async () => {
    const client = await setupTestRedis();
    await teardownTestRedis();

    expect(client.quit).toHaveBeenCalled();
    expect(getTestRedisClient()).toBeNull();
  });

  it('should reset the redis client via flushall', async () => {
    const client = await setupTestRedis();
    await resetTestRedis();

    expect(client.flushall).toHaveBeenCalled();
  });

  it('should ignore reset if client is not set up', async () => {
    await expect(resetTestRedis()).resolves.toBeUndefined();
  });

  it('should ignore teardown if client is not set up', async () => {
    await expect(teardownTestRedis()).resolves.toBeUndefined();
  });
});
