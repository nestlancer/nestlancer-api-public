import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyInterceptor } from '../../src/idempotency.interceptor';
import { Reflector } from '@nestjs/core';
import { RedisIdempotencyStore } from '../../src/stores/redis.store';
import { ExecutionContext, HttpException } from '@nestjs/common';
import { of } from 'rxjs';

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;
  let reflector: Reflector;
  let store: RedisIdempotencyStore;

  const mockStore = {
    lock: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    unlock: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyInterceptor,
        {
          provide: Reflector,
          useValue: { get: jest.fn() },
        },
        {
          provide: RedisIdempotencyStore,
          useValue: mockStore,
        },
      ],
    }).compile();

    interceptor = module.get<IdempotencyInterceptor>(IdempotencyInterceptor);
    reflector = module.get<Reflector>(Reflector);
    store = module.get<RedisIdempotencyStore>(RedisIdempotencyStore);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should pass through if not marked idempotent', async () => {
    const context = { getHandler: jest.fn() } as any;
    const next = { handle: jest.fn().mockReturnValue(of('res')) } as any;
    (reflector.get as jest.Mock).mockReturnValue(false);

    const result = await (await interceptor.intercept(context, next)).toPromise();

    expect(result).toBe('res');
    expect(next.handle).toHaveBeenCalled();
  });

  it('should throw error if header is missing', async () => {
    const context = {
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    } as any;
    const next = { handle: jest.fn() } as any;
    (reflector.get as jest.Mock).mockReturnValue(true);

    await expect(interceptor.intercept(context, next)).rejects.toThrow(HttpException);
  });

  it('should throw conflict if locked', async () => {
    const context = {
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ headers: { 'x-idempotency-key': 'key1' } }),
      }),
    } as any;
    const next = { handle: jest.fn() } as any;
    (reflector.get as jest.Mock).mockReturnValue(true);
    mockStore.lock.mockResolvedValue(false);

    await expect(interceptor.intercept(context, next)).rejects.toThrow(HttpException);
  });
});
