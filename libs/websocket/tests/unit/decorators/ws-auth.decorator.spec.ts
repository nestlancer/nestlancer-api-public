import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { WsCurrentUser } from '../../../src/decorators/ws-auth.decorator';
import { ExecutionContext } from '@nestjs/common';

describe('WsCurrentUser Decorator', () => {
  function getParamDecoratorFactory(decorator: Function) {
    class TestClass {
      public test(@decorator() _value: any) {}
    }
    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestClass, 'test');
    return args[Object.keys(args)[0]].factory;
  }

  it('should extract user from websocket client data', () => {
    const factory = getParamDecoratorFactory(WsCurrentUser);

    const mockClient = {
      data: {
        user: { id: 'user-123' },
      },
    };

    const mockContext = {
      switchToWs: () => ({
        getClient: () => mockClient,
      }),
    } as ExecutionContext;

    const result = factory(null, mockContext);
    expect(result).toEqual({ id: 'user-123' });
  });

  it('should return undefined if user is not present', () => {
    const factory = getParamDecoratorFactory(WsCurrentUser);

    const mockContext = {
      switchToWs: () => ({
        getClient: () => ({}),
      }),
    } as ExecutionContext;

    const result = factory(null, mockContext);
    expect(result).toBeUndefined();
  });
});
