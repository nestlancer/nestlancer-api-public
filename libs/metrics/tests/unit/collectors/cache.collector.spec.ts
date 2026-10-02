import { CacheMetricsCollector } from '../../../src/collectors/cache.collector';
import { MetricsService } from '../../../src/metrics.service';

describe('CacheMetricsCollector', () => {
  let collector: CacheMetricsCollector;
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

    collector = new CacheMetricsCollector(metricsService);
    collector.onModuleInit();
  });

  it('should record cache hit', () => {
    collector.recordHit('myCache');
    expect(mockCounter.inc).toHaveBeenCalledWith({ cache_name: 'myCache' });
  });

  it('should record cache miss', () => {
    collector.recordMiss('myCache');
    expect(mockCounter.inc).toHaveBeenCalledWith({ cache_name: 'myCache' });
  });

  it('should record operation duration', () => {
    collector.recordOperationDuration('get', 0.05, 'myCache');
    expect(mockHistogram.observe).toHaveBeenCalledWith(
      { operation: 'get', cache_name: 'myCache' },
      0.05,
    );
  });

  it('should set cache size', () => {
    collector.setCacheSize(100, 'myCache');
    expect(mockGauge.set).toHaveBeenCalledWith({ cache_name: 'myCache' }, 100);
  });
});
