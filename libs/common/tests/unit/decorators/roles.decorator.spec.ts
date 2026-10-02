import { ROLES_KEY, Roles } from '../../../src/decorators/roles.decorator';

describe('Roles Decorator', () => {
  it('should return a custom parameter decorator', () => {
    // By applying the decorator to a dummy class, we can check if metadata is set.
    // In NestJS, SetMetadata adds reflect-metadata to the target.
    class TestClass {
      @Roles('admin', 'manager')
      testMethod() {}
    }

    const roles = Reflect.getMetadata(ROLES_KEY, TestClass.prototype.testMethod);
    expect(roles).toEqual(['admin', 'manager']);
  });

  it('should return a custom parameter decorator with single role', () => {
    class TestClass {
      @Roles('user')
      testMethod() {}
    }

    const roles = Reflect.getMetadata(ROLES_KEY, TestClass.prototype.testMethod);
    expect(roles).toEqual(['user']);
  });
});
