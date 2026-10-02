import 'reflect-metadata';
import { Permissions } from '../../../src/decorators/permissions.decorator';
import { PERMISSIONS_KEY } from '../../../src/constants';

describe('Permissions Decorator', () => {
  it('should set correct metadata', () => {
    class TestClass {
      @Permissions('read:users', 'write:users')
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(PERMISSIONS_KEY, TestClass.prototype.testMethod);
    expect(metadata).toEqual(['read:users', 'write:users']);
  });
});
