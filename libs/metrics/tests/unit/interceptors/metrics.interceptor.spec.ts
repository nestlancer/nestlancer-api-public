import { ExecutionContext, CallHandler } from '@nestjs/common';
import { MetricsInterceptor } from '../../../src/interceptors/metrics.interceptor';
import { MetricsService } from '../../../src/metrics.service';
import { of } from 'rxjs';

describe('MetricsInterceptor', () => {
  let interceptor: MetricsInterceptor;
  let metricsService: jest.Mocked<MetricsService>;
  let mockCounter: { inc: jest.Mock };
  let mockHistogram: { observe: jest.Mock };

  beforeEach(() => {
    mockCounter = { inc: jest.fn() };
    mockHistogram = { observe: jest.fn() };

    metricsService = {
      createCounter: jest.fn().mockReturnValue(mockCounter),
      createHistogram: jest.fn().mockReturnValue(mockHistogram),
    } as unknown as jest.Mocked<MetricsService>;

    interceptor = new MetricsInterceptor(metricsService);
    interceptor.onModuleInit();
  });

  it('should observe response time and increment total request counter', (done) => {
    const mockRequest = { method: 'GET' };
    const mockResponse = { statusCode: 200 };
    const mockContext = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as unknown as ExecutionContext;

    const mockCallHandler = {
      handle: jest.fn().mockReturnValue(of('handled')),
    } as CallHandler;

    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      complete: () => {
        setImmediate(() => {
          expect(mockCounter.inc).toHaveBeenCalledWith({
            labels: { method: 'GET', status: '200', route: 'unknown' },
            exemplarLabels: undefined,
          });
          expect(mockHistogram.observe).toHaveBeenCalledWith({
            labels: { method: 'GET', route: 'unknown' },
            value: expect.any(Number),
            exemplarLabels: undefined,
          });
          done();
        });
      },
    });
  });
});
