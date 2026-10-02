import { Test, TestingModule } from '@nestjs/testing';
import { TracingService } from '../../src/tracing.service';

describe('TracingService', () => {
  let service: TracingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TracingService],
    }).compile();

    service = module.get<TracingService>(TracingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should store and retrieve correlationId within run context', () => {
    const correlationId = 'test-id-123';

    service.run(correlationId, () => {
      expect(service.getCorrelationId()).toBe(correlationId);
    });
  });

  it('should return undefined correlationId outside of context', () => {
    expect(service.getCorrelationId()).toBeUndefined();
  });

  it('should allow setting correlationId within context', () => {
    service.run('initial', () => {
      service.setCorrelationId('updated');
      expect(service.getCorrelationId()).toBe('updated');
    });
  });
});
