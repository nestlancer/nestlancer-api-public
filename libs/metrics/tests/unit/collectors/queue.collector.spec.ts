import { QueueMetricsCollector } from '../../../src/collectors/queue.collector';
import { MetricsService } from '../../../src/metrics.service';

describe('QueueMetricsCollector', () => {
  let collector: QueueMetricsCollector;
  let metricsService: jest.Mocked<MetricsService>;

  let mockCounter: any;
  let mockHistogram: any;
  let mockGauge: any;

  beforeEach(() => {
    mockCounter = { inc: jest.fn() };
    mockHistogram = { observe: jest.fn() };
    mockGauge = { set: jest.fn() };

    metricsService = {
      createCounter: jest.fn().mockReturnValue(mockCounter),
      createHistogram: jest.fn().mockReturnValue(mockHistogram),
      createGauge: jest.fn().mockReturnValue(mockGauge),
    } as unknown as jest.Mocked<MetricsService>;

    collector = new QueueMetricsCollector(metricsService);
    collector.onModuleInit();
  });

  it('should record published message', () => {
    collector.recordPublished('events', 'user.created');
    expect(mockCounter.inc).toHaveBeenCalledWith({
      exchange: 'events',
      routing_key: 'user.created',
    });
  });

  it('should record consumed message', () => {
    collector.recordConsumed('user_queue', 'success');
    expect(mockCounter.inc).toHaveBeenCalledWith({ queue: 'user_queue', status: 'success' });
  });

  it('should record failed message', () => {
    collector.recordFailed('user_queue', 'ValidationError');
    expect(mockCounter.inc).toHaveBeenCalledWith({
      queue: 'user_queue',
      error_type: 'ValidationError',
    });
  });

  it('should record processing duration', () => {
    collector.recordProcessingDuration('user_queue', 0.5);
    expect(mockHistogram.observe).toHaveBeenCalledWith({ queue: 'user_queue' }, 0.5);
  });

  it('should set queue depths', () => {
    collector.setQueueDepth('user_queue', 10);
    collector.setDlqDepth('user_queue_dlq', 2);
    expect(mockGauge.set).toHaveBeenCalledWith({ queue: 'user_queue' }, 10);
    expect(mockGauge.set).toHaveBeenCalledWith({ queue: 'user_queue_dlq' }, 2);
  });
});
