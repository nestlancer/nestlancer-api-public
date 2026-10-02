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

  it('should not wrap if already wrapped', (done) => {
    const wrappedData = { status: 'success', data: { biz: 'baz' } };
    next.handle = jest.fn().mockReturnValue(of(wrappedData));

    interceptor.intercept(context, next).subscribe((result) => {
      expect(result).toEqual(wrappedData);
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
