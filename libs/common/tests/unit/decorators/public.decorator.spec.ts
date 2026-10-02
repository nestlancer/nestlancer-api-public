import 'reflect-metadata';
import { Public, IS_PUBLIC_KEY } from '../../../src/decorators/public.decorator';

describe('Public Decorator', () => {
  it('should set isPublic metadata to true', () => {
    class TestClass {
      @Public()
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, TestClass.prototype.testMethod);
    expect(metadata).toBe(true);
  });
});
