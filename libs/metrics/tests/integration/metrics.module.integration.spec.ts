import { Test, TestingModule } from '@nestjs/testing';
import { MetricsModule } from '../../src/metrics.module';
import { MetricsService } from '../../src/metrics.service';
import { ConfigModule } from '@nestjs/config';

describe('MetricsModule (Integration)', () => {
  let module: TestingModule;
  let service: MetricsService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }), MetricsModule],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
    service.onModuleInit();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create and increment a counter', async () => {
    const counter = service.createCounter('test_counter', 'A test counter');
    expect(counter).toBeDefined();

    service.incrementCounter('test_counter');
    const metrics = await service.getMetrics();
    expect(metrics).toContain('test_counter');
  });

  it('should create and set a gauge', async () => {
    const gauge = service.createGauge('test_gauge', 'A test gauge');
    expect(gauge).toBeDefined();

    service.setGauge('test_gauge', 42);
    const metrics = await service.getMetrics();
    expect(metrics).toContain('test_gauge');
    expect(metrics).toContain('42');
  });
});
