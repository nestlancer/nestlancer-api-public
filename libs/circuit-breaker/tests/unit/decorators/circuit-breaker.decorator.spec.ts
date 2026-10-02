import 'reflect-metadata';
import {
  WithCircuitBreaker,
  CIRCUIT_BREAKER_KEY,
} from '../../../src/decorators/circuit-breaker.decorator';

describe('WithCircuitBreaker Decorator', () => {
  it('should set circuit breaker name metadata', () => {
    class TestClass {
      @WithCircuitBreaker('PaymentGateway')
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(CIRCUIT_BREAKER_KEY, TestClass.prototype.testMethod);
    expect(metadata).toEqual('PaymentGateway');
  });
});
