import { ExecutionContext, CallHandler } from '@nestjs/common';
import {
  CacheInterceptor,
  shouldCacheResponse,
} from '../../../src/interceptors/cache.interceptor';
import { of } from 'rxjs';

describe('CacheInterceptor', () => {
  let interceptor: CacheInterceptor;

  beforeEach(() => {
    interceptor = new CacheInterceptor();
  });

  it('should bypass cache for non-GET requests', () => {
    const mockRequest = { method: 'POST' };
    const mockContext = {
      switchToHttp: () => ({ getRequest: () => mockRequest }),
    } as unknown as ExecutionContext;

    const mockCallHandler = {
      handle: jest.fn().mockReturnValue(of('handled')),
    } as CallHandler;

    interceptor.intercept(mockContext, mockCallHandler);
    expect(mockCallHandler.handle).toHaveBeenCalled();
  });

  it('should pass through GET requests', () => {
    const mockRequest = { method: 'GET' };
    const mockContext = {
      switchToHttp: () => ({ getRequest: () => mockRequest }),
    } as unknown as ExecutionContext;

    const mockCallHandler = {
      handle: jest.fn().mockReturnValue(of('handled')),
    } as CallHandler;

    interceptor.intercept(mockContext, mockCallHandler);
    expect(mockCallHandler.handle).toHaveBeenCalled();
  });
});

describe('shouldCacheResponse', () => {
  it('rejects nullish and empty list payloads', () => {
    expect(shouldCacheResponse(null)).toBe(false);
    expect(shouldCacheResponse(undefined)).toBe(false);
    expect(shouldCacheResponse([])).toBe(false);
    expect(shouldCacheResponse({ items: [] })).toBe(false);
    expect(shouldCacheResponse({ data: [] })).toBe(false);
  });

  it('accepts non-empty payloads', () => {
    expect(shouldCacheResponse([{ id: 1 }])).toBe(true);
    expect(shouldCacheResponse({ items: [{ id: 1 }] })).toBe(true);
    expect(shouldCacheResponse({ data: { ok: true } })).toBe(true);
    expect(shouldCacheResponse({ status: 'ok' })).toBe(true);
  });
});
