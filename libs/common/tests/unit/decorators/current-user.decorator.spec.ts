import { ExecutionContext } from '@nestjs/common';
import { CurrentUser } from '../../../src/decorators/current-user.decorator';

// Import a custom factory definition as createParamDecorator returns a factory with Nest metadata
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

function getParamDecoratorFactory(decorator: Function) {
  class Test {
    public test(@decorator() value) {}
  }

  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
  return args[Object.keys(args)[0]].factory;
}

describe('CurrentUser Decorator', () => {
  const factory = getParamDecoratorFactory(CurrentUser);

  it('should return the full user object if no field is specified', () => {
    const mockUser = { userId: '123', email: 'test@example.com', role: 'user' };
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: mockUser,
        }),
      }),
    } as ExecutionContext;

    const result = factory(undefined, mockExecutionContext);
    expect(result).toEqual(mockUser);
  });

  it('should return a specific field from the user object if field is specified', () => {
    const mockUser = { userId: '456', email: 'specific@example.com' };
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: mockUser,
        }),
      }),
    } as ExecutionContext;

    const result = factory('email', mockExecutionContext);
    expect(result).toBe('specific@example.com');
  });

  it('should return undefined if the specified field does not exist', () => {
    const mockUser = { userId: '789' };
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: mockUser,
        }),
      }),
    } as ExecutionContext;

    const result = factory('nonexistent', mockExecutionContext);
    expect(result).toBeUndefined();
  });

  it('should return undefined if user object is not present', () => {
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    } as ExecutionContext;

    // Both with and without field should be undefined when user is falsy
    expect(factory(undefined, mockExecutionContext)).toBeUndefined();
    expect(factory('userId', mockExecutionContext)).toBeUndefined();
  });
});
