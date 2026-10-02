import { Test, TestingModule } from '@nestjs/testing';
import { CircuitBreakerModule } from '../../src/circuit-breaker.module';
import { CircuitBreakerService } from '../../src/circuit-breaker.service';
import { ConfigModule } from '@nestjs/config';

describe('CircuitBreakerModule (Integration)', () => {
  let module: TestingModule;
  let service: CircuitBreakerService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
        CircuitBreakerModule,
      ],
    }).compile();

    service = module.get<CircuitBreakerService>(CircuitBreakerService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should open circuit after failure threshold is reached', async () => {
    const name = 'test-circuit';
    const failureThreshold = 2;
    const failingFn = () => Promise.reject(new Error('Persistent failure'));

    // Threshold failure 1
    await expect(service.execute(name, failingFn, { failureThreshold })).rejects.toThrow(
      'Persistent failure',
    );
    // Threshold failure 2 -> should open
    await expect(service.execute(name, failingFn, { failureThreshold })).rejects.toThrow(
      'Persistent failure',
    );

    // 3rd call should throw "is OPEN" error
    await expect(service.execute(name, failingFn, { failureThreshold })).rejects.toThrow(
      `Circuit breaker '${name}' is OPEN`,
    );
  });
});
