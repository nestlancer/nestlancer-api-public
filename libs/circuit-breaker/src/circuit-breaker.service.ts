import { Injectable, Logger } from '@nestjs/common';
import { CircuitBreakerOptions, CircuitState } from './interfaces/circuit-breaker.interface';

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits = new Map<
    string,
    { state: CircuitState; failures: number; lastFailure: number; options: CircuitBreakerOptions }
  >();

  async execute<T>(
    name: string,
    fn: () => Promise<T>,
    options?: Partial<CircuitBreakerOptions>,
  ): Promise<T> {
    const defaults: CircuitBreakerOptions = {
      failureThreshold: 5,
      resetTimeoutMs: 30000,
      halfOpenRequests: 1,
      ...options,
    };
    const circuit = this.circuits.get(name) || {
      state: CircuitState.CLOSED,
      failures: 0,
      lastFailure: 0,
      options: defaults,
    };

    if (circuit.state === CircuitState.OPEN) {
      if (Date.now() - circuit.lastFailure > circuit.options.resetTimeoutMs) {
        circuit.state = CircuitState.HALF_OPEN;
      } else {
        throw new Error(`Circuit breaker '${name}' is OPEN`);
      }
    }

    try {
      const result = await fn();
      circuit.failures = 0;
      circuit.state = CircuitState.CLOSED;
      this.circuits.set(name, circuit);
      return result;
    } catch (error) {
      circuit.failures++;
      circuit.lastFailure = Date.now();
      if (circuit.failures >= circuit.options.failureThreshold) {
        circuit.state = CircuitState.OPEN;
        this.logger.warn(`Circuit breaker '${name}' opened after ${circuit.failures} failures`);
      }
      this.circuits.set(name, circuit);
      throw error;
    }
  }
}
