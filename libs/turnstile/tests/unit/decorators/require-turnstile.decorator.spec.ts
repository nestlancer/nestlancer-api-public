import 'reflect-metadata';
import {
  RequireTurnstile,
  REQUIRE_TURNSTILE_KEY,
} from '../../../src/decorators/require-turnstile.decorator';

describe('RequireTurnstile Decorator', () => {
  it('should apply requireTurnstile metadata', () => {
    class TestClass {
      @RequireTurnstile()
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(REQUIRE_TURNSTILE_KEY, TestClass.prototype.testMethod);
    expect(metadata).toBe(true);
  });
});
