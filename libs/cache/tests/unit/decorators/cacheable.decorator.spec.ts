import 'reflect-metadata';
import { Cacheable, CACHEABLE_KEY } from '../../../src/decorators/cacheable.decorator';

describe('Cacheable Decorator', () => {
  it('should set caching options correctly', () => {
    class TestClass {
      @Cacheable({ key: 'testKey', ttl: 3600, tags: ['tag1'] })
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(CACHEABLE_KEY, TestClass.prototype.testMethod);
    expect(metadata).toEqual({ key: 'testKey', ttl: 3600, tags: ['tag1'] });
  });

  it('should set empty options if none provided', () => {
    class TestClass {
      @Cacheable()
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(CACHEABLE_KEY, TestClass.prototype.testMethod);
    expect(metadata).toEqual({});
  });
});
