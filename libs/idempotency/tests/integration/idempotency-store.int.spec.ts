import { Test, TestingModule } from '@nestjs/testing';
import { RedisIdempotencyStore } from '../../src/stores/redis.store';
import { DatabaseIdempotencyStore } from '../../src/stores/database.store';
import { PrismaWriteService } from '@nestlancer/database';

describe('Idempotency Stores (Integration)', () => {
  let redisStore: RedisIdempotencyStore;
  let dbStore: DatabaseIdempotencyStore;
  let prisma: PrismaWriteService;

  const mockPrisma = {
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
    idempotencyKey: {
      findUnique: jest.fn(),
      upsert: jest.fn().mockImplementation(async (args) => {
        return {
          id: 'mocked',
          key: args.where.key,
          responseCode: args.create.responseCode,
          responseBody: args.create.responseBody,
        };
      }),
    },
  };

  const mockRedis = {
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: RedisIdempotencyStore,
          useValue: mockRedis,
        },
        DatabaseIdempotencyStore,
        {
          provide: PrismaWriteService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    redisStore = module.get<RedisIdempotencyStore>(RedisIdempotencyStore);
    dbStore = module.get<DatabaseIdempotencyStore>(DatabaseIdempotencyStore);
    prisma = module.get<PrismaWriteService>(PrismaWriteService);

    await (redisStore as any).onModuleInit?.();
    await prisma.onModuleInit();
  });

  afterEach(async () => {
    await (redisStore as any).onModuleDestroy?.();
    await prisma.onModuleDestroy();
  });

  describe('RedisIdempotencyStore', () => {
    it('should set and get an idempotency record', async () => {
      const key = 'test-key-redis';
      const response = { status: 200, body: { success: true } };

      mockRedis.get.mockResolvedValueOnce(response);

      await redisStore.set(key, { responseCode: 200, responseBody: { success: true } }, 100);
      const retrieved = await redisStore.get(key);

      expect(retrieved).toEqual(response);
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should return null for non-existent key', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      const retrieved = await redisStore.get('missing');
      expect(retrieved).toBeNull();
    });
  });

  describe('DatabaseIdempotencyStore', () => {
    it('should set and get an idempotency record', async () => {
      dbStore.setPrisma(prisma);
      const key = 'test-key-db';
      const responseData = { responseCode: 201, responseBody: { id: 1 } };

      mockPrisma.idempotencyKey.findUnique.mockResolvedValueOnce({
        responseCode: responseData.responseCode,
        responseBody: responseData.responseBody,
      });

      await dbStore.set(key, responseData, 3600);
      const retrieved = await dbStore.get(key);

      expect(retrieved).toEqual(responseData);
      expect(mockPrisma.idempotencyKey.upsert).toHaveBeenCalled();
    });
  });
});
