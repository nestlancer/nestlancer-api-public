import { HttpMetricsCollector } from '../../../src/collectors/http.collector';
import { MetricsService } from '../../../src/metrics.service';

describe('HttpMetricsCollector', () => {
  let collector: HttpMetricsCollector;
  let metricsService: jest.Mocked<MetricsService>;

  let mockCounter: any;
  let mockHistogram: any;
  let mockGauge: any;

  beforeEach(() => {
    mockCounter = { inc: jest.fn() };
    mockHistogram = { observe: jest.fn() };
    mockGauge = { inc: jest.fn(), dec: jest.fn() };

    metricsService = {
      createCounter: jest.fn().mockReturnValue(mockCounter),
      createHistogram: jest.fn().mockReturnValue(mockHistogram),
      createGauge: jest.fn().mockReturnValue(mockGauge),
    } as unknown as jest.Mocked<MetricsService>;

    collector = new HttpMetricsCollector(metricsService);
    collector.onModuleInit();
  });

  it('should record request data properly', () => {
    collector.recordRequest('GET', '/users', 200, 0.5, 500, 1024);

    expect(mockCounter.inc).toHaveBeenCalledWith({
      method: 'GET',
      route: '/users',
      status_code: '200',
    });
    expect(mockHistogram.observe).toHaveBeenCalledTimes(3); // duration, requestSize, responseSize
  });

  it('should increment active requests', () => {
    collector.incrementActive('POST');
    expect(mockGauge.inc).toHaveBeenCalledWith({ method: 'POST' });
  });

  it('should decrement active requests', () => {
    collector.decrementActive('GET');
    expect(mockGauge.dec).toHaveBeenCalledWith({ method: 'GET' });
  });
});
