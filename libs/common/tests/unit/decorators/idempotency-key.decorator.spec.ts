import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { IdempotencyKey } from '../../../src/decorators/idempotency-key.decorator';
import { ExecutionContext } from '@nestjs/common';

describe('IdempotencyKey Decorator', () => {
  function getParamDecoratorFactory(decorator: Function) {
    class TestClass {
      public test(@decorator() _value: string) {}
    }
    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestClass, 'test');
    return args[Object.keys(args)[0]].factory;
  }

  it('should extract x-idempotency-key from request headers', () => {
    const factory = getParamDecoratorFactory(IdempotencyKey);

    const mockRequest = {
      headers: {
        'x-idempotency-key': 'test-key-123',
      },
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as ExecutionContext;

    const result = factory(null, mockContext);
    expect(result).toBe('test-key-123');
  });

  it('should return undefined if header is missing', () => {
    const factory = getParamDecoratorFactory(IdempotencyKey);

    const mockRequest = { headers: {} };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as ExecutionContext;

    const result = factory(null, mockContext);
    expect(result).toBeUndefined();
  });
});
