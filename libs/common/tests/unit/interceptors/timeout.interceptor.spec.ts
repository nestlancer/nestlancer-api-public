import { ExecutionContext, CallHandler, RequestTimeoutException } from '@nestjs/common';
import { TimeoutInterceptor } from '../../../src/interceptors/timeout.interceptor';
import { of, throwError, delay, Observable } from 'rxjs';

describe('TimeoutInterceptor', () => {
  let interceptor: TimeoutInterceptor;

  beforeEach(() => {
    // Set short timeout for test
    interceptor = new TimeoutInterceptor(50);
  });

  it('should pass through if it completes before timeout', (done) => {
    const mockContext = {} as ExecutionContext;
    const mockCallHandler = {
      handle: jest.fn().mockReturnValue(of('handled').pipe(delay(10))),
    } as CallHandler;

    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      next: (val) => {
        expect(val).toBe('handled');
        done();
      },
    });
  });

  it('should throw RequestTimeoutException if it exceeds timeout', (done) => {
    const mockContext = {} as ExecutionContext;
    const mockCallHandler = {
      handle: jest.fn().mockReturnValue(
        new Observable((subscriber) => {
          setTimeout(() => {
            subscriber.next('too late');
            subscriber.complete();
          }, 100); // Exceeds 50ms timeout
        }),
      ),
    } as CallHandler;

    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      next: () => {
        done.fail('Should not emit next');
      },
      error: (err) => {
        expect(err).toBeInstanceOf(RequestTimeoutException);
        done();
      },
    });
  });

  it('should throw original error if not a timeout error', (done) => {
    const mockContext = {} as ExecutionContext;
    const mockCallHandler = {
      handle: jest.fn().mockReturnValue(throwError(() => new Error('Other error'))),
    } as CallHandler;

    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      error: (err) => {
        expect(err.message).toBe('Other error');
        done();
      },
    });
  });
});
