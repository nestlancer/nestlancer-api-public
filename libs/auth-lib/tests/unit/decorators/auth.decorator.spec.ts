import 'reflect-metadata';
import { Auth } from '../../../src/decorators/auth.decorator';
import { ROLES_KEY } from '../../../src/constants';

describe('Auth Decorator', () => {
  it('should apply metadata with specific roles', () => {
    class TestClass {
      @Auth('ADMIN', 'USER')
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(ROLES_KEY, TestClass.prototype.testMethod);
    expect(metadata).toEqual(['ADMIN', 'USER']);
  });

  it('should apply without roles metadata if empty', () => {
    class TestClass {
      @Auth()
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(ROLES_KEY, TestClass.prototype.testMethod);
    expect(metadata).toBeUndefined(); // undefined is passed if empty
  });
});
