import { DatabaseMetricsCollector } from '../../../src/collectors/database.collector';
import { MetricsService } from '../../../src/metrics.service';

describe('DatabaseMetricsCollector', () => {
  let collector: DatabaseMetricsCollector;
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

    collector = new DatabaseMetricsCollector(metricsService);
    collector.onModuleInit();
  });

  it('should record query', () => {
    collector.recordQuery('findMany', 'User', 0.05);
    expect(mockCounter.inc).toHaveBeenCalledWith({ operation: 'findMany', model: 'User' });
    expect(mockHistogram.observe).toHaveBeenCalledWith(
      { operation: 'findMany', model: 'User' },
      0.05,
    );
  });

  it('should record error', () => {
    collector.recordError('findMany', 'User', 'TimeoutError');
    expect(mockCounter.inc).toHaveBeenCalledWith({
      operation: 'findMany',
      model: 'User',
      error_type: 'TimeoutError',
    });
  });

  it('should set pool metrics', () => {
    collector.setPoolMetrics('primary', 5, 10);
    expect(mockGauge.set).toHaveBeenCalledWith({ pool: 'primary' }, 5);
    expect(mockGauge.set).toHaveBeenCalledWith({ pool: 'primary' }, 10);
  });
});
