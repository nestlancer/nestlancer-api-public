import { Test, TestingModule } from '@nestjs/testing';
import { CircuitBreakerService } from '../../src/circuit-breaker.service';
// import { CircuitState } from '../../src/interfaces/circuit-breaker.interface';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CircuitBreakerService],
    }).compile();

    service = module.get<CircuitBreakerService>(CircuitBreakerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should execute successfully when closed', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const result = await service.execute('test', fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalled();
  });

  it('should open after threshold failures', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('fail'));
    const options = { failureThreshold: 2 };

    await expect(service.execute('test', fn, options)).rejects.toThrow('fail');
    await expect(service.execute('test', fn, options)).rejects.toThrow('fail');

    // Third call should fail with circuit breaker error
    await expect(service.execute('test', fn, options)).rejects.toThrow(
      "Circuit breaker 'test' is OPEN",
    );
  });

  it('should transition to half-open after timeout', async () => {
    jest.useFakeTimers();
    const fnFail = jest.fn().mockRejectedValue(new Error('fail'));
    const fnSuccess = jest.fn().mockResolvedValue('success');
    const options = { failureThreshold: 1, resetTimeoutMs: 1000 };

    await expect(service.execute('test', fnFail, options)).rejects.toThrow('fail');

    // Circuit is OPEN
    await expect(service.execute('test', fnSuccess, options)).rejects.toThrow(
      "Circuit breaker 'test' is OPEN",
    );

    // Wait for timeout
    jest.advanceTimersByTime(1100);

    // Should now be HALF-OPEN and allow a request
    const result = await service.execute('test', fnSuccess, options);
    expect(result).toBe('success');

    jest.useRealTimers();
  });
});
