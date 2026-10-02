import 'reflect-metadata';
import { ReadOnly, IS_READ_ONLY } from '../../../src/decorators/read-only.decorator';

describe('ReadOnly Decorator', () => {
  it('should mark method as read-only by setting metadata to true', () => {
    class TestClass {
      @ReadOnly()
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(IS_READ_ONLY, TestClass.prototype.testMethod);
    expect(metadata).toBe(true);
  });
});
