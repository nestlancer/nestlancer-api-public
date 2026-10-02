import { ExecutionContext, CallHandler } from '@nestjs/common';
import { TracingInterceptor } from '../../../src/interceptors/tracing.interceptor';
import { TracingService } from '../../../src/tracing.service';
import { of } from 'rxjs';

describe('TracingInterceptor', () => {
  let interceptor: TracingInterceptor;
  let tracingService: jest.Mocked<TracingService>;

  beforeEach(() => {
    tracingService = {
      run: jest.fn().mockImplementation((id, cb) => cb()),
    } as unknown as jest.Mocked<TracingService>;

    interceptor = new TracingInterceptor(tracingService);
  });

  it('should pass correlation id to tracing service', () => {
    const mockRequest = { headers: { 'x-correlation-id': 'test-123' } };
    const mockContext = {
      switchToHttp: () => ({ getRequest: () => mockRequest }),
    } as unknown as ExecutionContext;

    const mockCallHandler = {
      handle: jest.fn().mockReturnValue(of('handled')),
    } as CallHandler;

    interceptor.intercept(mockContext, mockCallHandler);

    expect(tracingService.run).toHaveBeenCalledWith('test-123', expect.any(Function));
  });

  it('should use empty string if no correlation id', () => {
    const mockRequest = { headers: {} };
    const mockContext = {
      switchToHttp: () => ({ getRequest: () => mockRequest }),
    } as unknown as ExecutionContext;

    const mockCallHandler = {
      handle: jest.fn().mockReturnValue(of('handled')),
    } as CallHandler;

    interceptor.intercept(mockContext, mockCallHandler);

    expect(tracingService.run).toHaveBeenCalledWith('', expect.any(Function));
  });
});
