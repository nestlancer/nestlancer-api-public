import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '../../src/cache.service';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    quit: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    smembers: jest.fn(),
    sadd: jest.fn(),
  }));
});

describe('CacheService', () => {
  let service: CacheService;
  let mockRedis: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: 'CACHE_OPTIONS',
          useValue: { redisUrl: 'redis://localhost:6379' },
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    await service.onModuleInit();
    mockRedis = service.getClient();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  // Dummy test to use the Redis import and satisfy linter if necessary,
  // although 'any' should generally be avoided, here it's for mocking simplicity.
  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(mockRedis).toBeDefined();
  });

  describe('get', () => {
    it('should return parsed JSON value', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ foo: 'bar' }));
      const result = await service.get('test-key');
      expect(result).toEqual({ foo: 'bar' });
      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null if value not found', async () => {
      mockRedis.get.mockResolvedValue(null);
      const result = await service.get('test-key');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value without TTL', async () => {
      await service.set('key', { val: 1 });
      expect(mockRedis.set).toHaveBeenCalledWith('key', JSON.stringify({ val: 1 }));
    });

    it('should set value with TTL', async () => {
      await service.set('key', { val: 1 }, 60);
      expect(mockRedis.setex).toHaveBeenCalledWith('key', 60, JSON.stringify({ val: 1 }));
    });
  });

  describe('del', () => {
    it('should call redis del', async () => {
      await service.del('key');
      expect(mockRedis.del).toHaveBeenCalledWith('key');
    });
  });

  describe('exists', () => {
    it('should return true if key exists', async () => {
      mockRedis.exists.mockResolvedValue(1);
      expect(await service.exists('key')).toBe(true);
    });

    it('should return false if key does not exist', async () => {
      mockRedis.exists.mockResolvedValue(0);
      expect(await service.exists('key')).toBe(false);
    });
  });

  describe('incr', () => {
    it('should increment key', async () => {
      mockRedis.incr.mockResolvedValue(10);
      expect(await service.incr('key')).toBe(10);
      expect(mockRedis.incr).toHaveBeenCalledWith('key');
    });
  });

  describe('tagging', () => {
    it('should tag a key', async () => {
      await service.tagKey('key1', ['tag1', 'tag2']);
      expect(mockRedis.sadd).toHaveBeenCalledWith('tag:tag1', 'key1');
      expect(mockRedis.sadd).toHaveBeenCalledWith('tag:tag2', 'key1');
    });

    it('should invalidate by tag', async () => {
      mockRedis.smembers.mockResolvedValue(['key1', 'key2']);
      await service.invalidateByTag('tag1');
      expect(mockRedis.del).toHaveBeenCalledWith('key1', 'key2');
      expect(mockRedis.del).toHaveBeenCalledWith('tag:tag1');
    });

    it('should do nothing if tag has no keys', async () => {
      mockRedis.smembers.mockResolvedValue([]);
      await service.invalidateByTag('tag1');
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });
});
