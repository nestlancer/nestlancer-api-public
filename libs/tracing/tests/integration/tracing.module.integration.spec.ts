import { Test, TestingModule } from '@nestjs/testing';
import { TracingModule } from '../../src/tracing.module';
import { TracingService } from '../../src/tracing.service';
import { ConfigModule } from '@nestjs/config';

describe('TracingModule (Integration)', () => {
  let module: TestingModule;
  let service: TracingService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
        TracingModule.forRoot(),
      ],
    }).compile();

    service = module.get<TracingService>(TracingService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should manage correlation ID in context', (done) => {
    const correlationId = 'test-id';

    service.run(correlationId, () => {
      expect(service.getCorrelationId()).toBe(correlationId);
      done();
    });
  });

  it('should be undefined outside context', () => {
    expect(service.getCorrelationId()).toBeUndefined();
  });
});
