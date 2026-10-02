import 'reflect-metadata';
import {
  CacheInvalidate,
  CACHE_INVALIDATE_KEY,
} from '../../../src/decorators/cache-invalidate.decorator';

describe('CacheInvalidate Decorator', () => {
  it('should set tags correctly', () => {
    class TestClass {
      @CacheInvalidate('users:*', 'stats:*')
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(CACHE_INVALIDATE_KEY, TestClass.prototype.testMethod);
    expect(metadata).toEqual(['users:*', 'stats:*']);
  });
});
