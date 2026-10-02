import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from '../../src/metrics.service';
// import * as promClient from 'prom-client';

jest.mock('prom-client', () => ({
  Registry: jest.fn().mockImplementation(() => ({
    registerMetric: jest.fn(),
    metrics: jest.fn().mockResolvedValue('metrics-string'),
    contentType: 'text/plain',
    setDefaultLabels: jest.fn(),
  })),
  Counter: jest.fn().mockImplementation(() => ({
    inc: jest.fn(),
  })),
  Gauge: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    inc: jest.fn(),
    dec: jest.fn(),
  })),
  Histogram: jest.fn().mockImplementation(() => ({
    startTimer: jest.fn().mockReturnValue(jest.fn()),
    observe: jest.fn(),
  })),
  collectDefaultMetrics: jest.fn(),
}));

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create and increment a counter', () => {
    const counter = service.createCounter('test_counter', 'help');
    service.incrementCounter('test_counter');
    expect(counter.inc).toHaveBeenCalled();
  });

  it('should return metrics string', async () => {
    const metrics = await service.getMetrics();
    expect(metrics).toBe('metrics-string');
  });
});
