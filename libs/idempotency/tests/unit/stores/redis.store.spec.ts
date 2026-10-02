import { Test, TestingModule } from '@nestjs/testing';
import { RedisIdempotencyStore } from '../../../src/stores/redis.store';
import Redis from 'ioredis';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
  }));
});

describe('RedisIdempotencyStore', () => {
  let store: RedisIdempotencyStore;
  let mockRedis: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisIdempotencyStore],
    }).compile();

    store = module.get<RedisIdempotencyStore>(RedisIdempotencyStore);
    mockRedis = (store as any).redis;
  });

  it('should be defined', () => {
    expect(store).toBeDefined();
  });

  it('should get cached response', async () => {
    const data = { responseCode: 200, responseBody: { foo: 'bar' } };
    mockRedis.get.mockResolvedValue(JSON.stringify(data));

    const result = await store.get('key1');

    expect(result).toEqual(data);
    expect(mockRedis.get).toHaveBeenCalledWith('idempotency:key1');
  });

  it('should set response with default ttl', async () => {
    const data = { responseCode: 200, responseBody: { foo: 'bar' } };
    await store.set('key1', data);

    expect(mockRedis.set).toHaveBeenCalledWith(
      'idempotency:key1',
      JSON.stringify(data),
      'EX',
      86400,
    );
  });

  it('should lock key', async () => {
    mockRedis.set.mockResolvedValue('OK');
    const result = await store.lock('key1');

    expect(result).toBe(true);
    expect(mockRedis.set).toHaveBeenCalledWith('idempotency:key1:lock', '1', 'EX', 30, 'NX');
  });

  it('should unlock key', async () => {
    await store.unlock('key1');
    expect(mockRedis.del).toHaveBeenCalledWith('idempotency:key1:lock');
  });
});
