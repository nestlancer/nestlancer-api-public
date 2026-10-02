import 'reflect-metadata';
import { Idempotent, IDEMPOTENT_KEY } from '../../../src/decorators/idempotent.decorator';

describe('Idempotent Decorator', () => {
  it('should mark method as idempotent by setting metadata to true', () => {
    class TestClass {
      @Idempotent()
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(IDEMPOTENT_KEY, TestClass.prototype.testMethod);
    expect(metadata).toBe(true);
  });
});
