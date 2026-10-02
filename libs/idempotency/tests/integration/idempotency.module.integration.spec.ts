import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyModule } from '../../src/idempotency.module';
import { RedisIdempotencyStore } from '../../src/stores/redis.store';
import { DatabaseIdempotencyStore } from '../../src/stores/database.store';
import { IdempotencyInterceptor } from '../../src/idempotency.interceptor';
import { ConfigModule } from '@nestjs/config';
import { HttpException, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';

// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  }));
});

describe('IdempotencyModule (Integration)', () => {
  let module: TestingModule;
  let redisStore: RedisIdempotencyStore;
  let dbStore: DatabaseIdempotencyStore;
  let interceptor: IdempotencyInterceptor;
  let reflector: Reflector;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
        IdempotencyModule.forRoot(),
      ],
    }).compile();

    redisStore = module.get<RedisIdempotencyStore>(RedisIdempotencyStore);
    dbStore = module.get<DatabaseIdempotencyStore>(DatabaseIdempotencyStore);
    interceptor = module.get<IdempotencyInterceptor>(IdempotencyInterceptor);
    reflector = module.get<Reflector>(Reflector);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(redisStore).toBeDefined();
    expect(dbStore).toBeDefined();
    expect(interceptor).toBeDefined();
  });

  describe('IdempotencyInterceptor', () => {
    it('should pass through when endpoint is not marked as idempotent', async () => {
      jest.spyOn(reflector, 'get').mockReturnValueOnce(false);

      const mockContext = {
        getHandler: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ headers: {} }),
          getResponse: () => ({ statusCode: 200 }),
        }),
      } as unknown as ExecutionContext;

      const mockHandler: CallHandler = {
        handle: () => of({ data: 'test' }),
      };

      const result$ = await interceptor.intercept(mockContext, mockHandler);
      expect(result$).toBeDefined();
    });

    it('should throw BAD_REQUEST when idempotent endpoint has no X-Idempotency-Key header', async () => {
      jest.spyOn(reflector, 'get').mockReturnValueOnce(true);

      const mockContext = {
        getHandler: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ headers: {} }),
          getResponse: () => ({ statusCode: 200 }),
        }),
      } as unknown as ExecutionContext;

      const mockHandler: CallHandler = {
        handle: () => of({ data: 'test' }),
      };

      try {
        await interceptor.intercept(mockContext, mockHandler);
        fail('Should have thrown');
      } catch (error: any) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(400);
        const response = error.getResponse();
        expect(response.error.code).toBe('IDEM_001');
      }
    });
  });

  describe('RedisIdempotencyStore', () => {
    it('should be an injectable instance', () => {
      expect(redisStore).toBeDefined();
      expect(typeof redisStore.get).toBe('function');
      expect(typeof redisStore.set).toBe('function');
    });
  });

  describe('DatabaseIdempotencyStore', () => {
    it('should be an injectable instance', () => {
      expect(dbStore).toBeDefined();
      expect(typeof dbStore.get).toBe('function');
      expect(typeof dbStore.set).toBe('function');
    });
  });
});
