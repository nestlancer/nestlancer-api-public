import { Test, TestingModule } from '@nestjs/testing';
import { CacheModule } from '../../src/cache.module';
import { CacheService } from '../../src/cache.service';
import { ConfigModule } from '@nestjs/config';

const redisUrl = process.env.REDIS_CACHE_URL || process.env.REDIS_URL;
const describeRedisIntegration = redisUrl ? describe : describe.skip;

describeRedisIntegration('CacheModule (Integration)', () => {
  let module: TestingModule;
  let service: CacheService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
        CacheModule.forRoot({ redisUrl }),
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    await module.init();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should set and get values from cache', async () => {
    const key = `test-module-key-${Date.now()}`;
    const value = { foo: 'bar', date: new Date().toISOString() };

    await service.set(key, value);
    const result = await service.get(key);

    expect(result).toEqual(value);

    // Cleanup
    await service.del(key);
    const exists = await service.exists(key);
    expect(exists).toBe(false);
  });
});
