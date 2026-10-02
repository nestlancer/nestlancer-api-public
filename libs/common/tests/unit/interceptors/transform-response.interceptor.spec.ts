import { TransformResponseInterceptor } from '../../../src/interceptors/transform-response.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('TransformResponseInterceptor', () => {
  let interceptor: TransformResponseInterceptor<any>;
  let context: ExecutionContext;
  let next: CallHandler;

  beforeEach(() => {
    interceptor = new TransformResponseInterceptor();
    context = {
      switchToHttp: jest.fn().mockReturnThis(),
      getRequest: jest.fn().mockReturnValue({
        url: '/test',
        headers: {
          'x-correlation-id': 'uuid-123',
        },
      }),
      getResponse: jest.fn().mockReturnThis(),
    } as any;
    next = {
      handle: jest.fn().mockReturnValue(of({ foo: 'bar' })),
    };
  });

  it('should transform successful response into standard envelope', (done) => {
    interceptor.intercept(context, next).subscribe((result) => {
      expect(result.status).toBe('success');
      expect(result.data).toEqual({ foo: 'bar' });
      expect(result.metadata.requestId).toBe('uuid-123');
      expect(result.metadata.path).toBe('/test');
      done();
    });
  });

  it('uses the gateway public path when the internal request was rewritten', (done) => {
    context = {
      switchToHttp: jest.fn().mockReturnThis(),
      getRequest: jest.fn().mockReturnValue({
        url: '/api/documents/verify/NL-INV-2026-000001',
        headers: {
          'x-correlation-id': 'uuid-123',
          'x-gateway-source': 'nestlancer-gateway',
          'x-public-path': '/api/v1/documents/verify/NL-INV-2026-000001',
        },
      }),
      getResponse: jest.fn().mockReturnThis(),
    } as any;

    interceptor.intercept(context, next).subscribe((result) => {
      expect(result.metadata.path).toBe('/api/v1/documents/verify/NL-INV-2026-000001');
      done();
    });
  });

  it('keeps a complete envelope untouched', (done) => {
    const complete = {
      status: 'success',
      data: { biz: 'baz' },
      metadata: {
        timestamp: '2026-01-01T00:00:00.000Z',
        requestId: 'preset',
        version: 'v1',
        path: '/preset',
      },
    };
    next.handle = jest.fn().mockReturnValue(of(complete));

    interceptor.intercept(context, next).subscribe((result) => {
      expect(result).toEqual(complete);
      done();
    });
  });

  // NL-BUG-API-ENV-001 — a hand-built `{ status, data }` used to escape the
  // interceptor entirely and ship without `metadata` (so without `requestId`).
  it('adds missing metadata to a partial envelope without re-nesting data', (done) => {
    next.handle = jest.fn().mockReturnValue(of({ status: 'success', data: { biz: 'baz' } }));

    interceptor.intercept(context, next).subscribe((result) => {
      expect(result.status).toBe('success');
      expect(result.data).toEqual({ biz: 'baz' });
      expect(result.metadata.requestId).toBe('uuid-123');
      done();
    });
  });

  // NL-BUG-API-ENV-001 — the live `/api/v1/admin/payments` shape: `status` plus
  // payload keys, no `data`, no `metadata`.
  it('folds non-envelope keys into data when a controller omits `data`', (done) => {
    next.handle = jest.fn().mockReturnValue(
      of({
        status: 'success',
        items: [{ id: 'pay_1' }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      }),
    );

    interceptor.intercept(context, next).subscribe((result) => {
      expect(result.data).toEqual({
        items: [{ id: 'pay_1' }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });
      expect(result.metadata.requestId).toBe('uuid-123');
      expect(result).not.toHaveProperty('items');
      done();
    });
  });

  it('wraps a bare acknowledgement into an empty data object', (done) => {
    next.handle = jest.fn().mockReturnValue(of({ status: 'success' }));

    interceptor.intercept(context, next).subscribe((result) => {
      expect(result.data).toEqual({});
      expect(result.metadata.requestId).toBe('uuid-123');
      done();
    });
  });

  it('respects controller-supplied metadata over generated metadata', (done) => {
    next.handle = jest
      .fn()
      .mockReturnValue(of({ status: 'success', ok: true, metadata: { requestId: 'custom' } }));

    interceptor.intercept(context, next).subscribe((result) => {
      expect(result.metadata.requestId).toBe('custom');
      expect(result.data).toEqual({ ok: true });
      done();
    });
  });

  it('still wraps arrays and primitives as data', (done) => {
    next.handle = jest.fn().mockReturnValue(of([{ id: 1 }]));

    interceptor.intercept(context, next).subscribe((result) => {
      expect(result.data).toEqual([{ id: 1 }]);
      expect(result.metadata.requestId).toBe('uuid-123');
      done();
    });
  });

  it('should not wrap Swagger / docs-specs paths (raw OpenAPI JSON)', (done) => {
    context = {
      switchToHttp: jest.fn().mockReturnThis(),
      getRequest: jest.fn().mockReturnValue({
        path: '/api/v1/docs-specs/auth',
        url: '/api/v1/docs-specs/auth',
        headers: {},
      }),
      getResponse: jest.fn().mockReturnThis(),
    } as any;

    interceptor.intercept(context, next).subscribe((result) => {
      expect(result).toEqual({ foo: 'bar' });
      done();
    });
  });
});
