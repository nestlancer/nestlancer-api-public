import { ExecutionContext, CallHandler } from '@nestjs/common';
import { ResponseSerializerInterceptor } from '../../../src/interceptors/response-serializer.interceptor';
import { of } from 'rxjs';

describe('ResponseSerializerInterceptor', () => {
  let interceptor: ResponseSerializerInterceptor;

  beforeEach(() => {
    interceptor = new ResponseSerializerInterceptor();
  });

  it('should serialize the response', (done) => {
    const mockContext = {} as ExecutionContext;
    const mockData = { id: 1, date: new Date('2023-01-01') };
    const mockCallHandler = {
      handle: jest.fn().mockReturnValue(of(mockData)),
    } as CallHandler;

    interceptor.intercept(mockContext, mockCallHandler).subscribe((result: any) => {
      expect(result).toEqual({ id: 1, date: '2023-01-01T00:00:00.000Z' });
      done();
    });
  });
});
