import { Test, TestingModule } from '@nestjs/testing';
import { CacheModule } from '../../src/cache.module';
import { CacheService } from '../../src/cache.service';

const redisUrl = process.env.REDIS_CACHE_URL || process.env.REDIS_URL;
const describeRedisIntegration = redisUrl ? describe : describe.skip;

describeRedisIntegration('Cache Integration', () => {
  let cacheService: CacheService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CacheModule.forRoot({ redisUrl })],
    }).compile();

    cacheService = module.get<CacheService>(CacheService);
    await cacheService.onModuleInit();
  });

  afterAll(async () => {
    await cacheService.onModuleDestroy();
  });

  it('should set, get, and delete values', async () => {
    const key = `test-key-${Date.now()}`;
    const value = { foo: 'bar' };

    await cacheService.set(key, value);

    expect(await cacheService.exists(key)).toBe(true);

    const result = await cacheService.get<{ foo: string }>(key);
    expect(result).toEqual(value);

    await cacheService.del(key);
    expect(await cacheService.exists(key)).toBe(false);
  });

  it('should respect TTL', async () => {
    jest.setTimeout(10000);
    const key = `test-ttl-${Date.now()}`;
    await cacheService.set(key, 'value', 1);

    expect(await cacheService.exists(key)).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 1100));

    expect(await cacheService.exists(key)).toBe(false);
  });

  it('should handle tag-based invalidation', async () => {
    const key1 = `test-tag-1-${Date.now()}`;
    const key2 = `test-tag-2-${Date.now()}`;
    const tag = `test-tag-group-${Date.now()}`;

    await cacheService.set(key1, 'val1');
    await cacheService.set(key2, 'val2');

    await cacheService.tagKey(key1, [tag]);
    await cacheService.tagKey(key2, [tag]);

    expect(await cacheService.exists(key1)).toBe(true);
    expect(await cacheService.exists(key2)).toBe(true);

    await cacheService.invalidateByTag(tag);

    expect(await cacheService.exists(key1)).toBe(false);
    expect(await cacheService.exists(key2)).toBe(false);
  });
});
