import 'reflect-metadata';
import { Transactional, IS_TRANSACTIONAL } from '../../../src/decorators/transactional.decorator';

describe('Transactional Decorator', () => {
  it('should mark method as transactional by setting metadata to true', () => {
    class TestClass {
      @Transactional()
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(IS_TRANSACTIONAL, TestClass.prototype.testMethod);
    expect(metadata).toBe(true);
  });
});
