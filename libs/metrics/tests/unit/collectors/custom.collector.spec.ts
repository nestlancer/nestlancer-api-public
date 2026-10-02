import { CustomMetricsCollector } from '../../../src/collectors/custom.collector';
import { MetricsService } from '../../../src/metrics.service';

describe('CustomMetricsCollector', () => {
  let collector: CustomMetricsCollector;
  let metricsServiceMock: jest.Mocked<MetricsService>;

  beforeEach(() => {
    metricsServiceMock = {
      createCounter: jest.fn(),
      createHistogram: jest.fn(),
      createGauge: jest.fn(),
      incrementCounter: jest.fn(),
      observeHistogram: jest.fn(),
      setGauge: jest.fn(),
    } as unknown as jest.Mocked<MetricsService>;
    collector = new CustomMetricsCollector(metricsServiceMock);
  });

  it('should register metrics on module init', () => {
    collector.onModuleInit();
    expect(metricsServiceMock.createCounter).toHaveBeenCalledWith(
      'business_events_total',
      expect.any(String),
      ['event_type', 'service'],
    );
    expect(metricsServiceMock.createHistogram).toHaveBeenCalledWith(
      'payment_amount_paise',
      expect.any(String),
      ['currency'],
      expect.any(Array),
    );
  });

  it('should record business events correctly', () => {
    collector.recordBusinessEvent('user_signup', 'auth-service');
    expect(metricsServiceMock.incrementCounter).toHaveBeenCalledWith('business_events_total', {
      event_type: 'user_signup',
      service: 'auth-service',
    });
  });

  it('should record payments correctly', () => {
    collector.recordPayment('success', 'INR', 50000);
    expect(metricsServiceMock.incrementCounter).toHaveBeenCalledWith('payments_processed_total', {
      status: 'success',
      currency: 'INR',
    });
    expect(metricsServiceMock.observeHistogram).toHaveBeenCalledWith(
      'payment_amount_paise',
      50000,
      {
        currency: 'INR',
      },
    );
  });

  it('should update gauges correctly', () => {
    collector.setActiveProjects(10);
    expect(metricsServiceMock.setGauge).toHaveBeenCalledWith('active_projects_total', 10);

    collector.setRegisteredUsers(100, 'admin');
    expect(metricsServiceMock.setGauge).toHaveBeenCalledWith('registered_users_total', 100, {
      role: 'admin',
    });
  });
});
