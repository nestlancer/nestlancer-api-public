import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from '../../../src/services/health.service';
import { DatabaseHealthService } from '../../../src/services/database-health.service';
import { CacheHealthService } from '../../../src/services/cache-health.service';
import { QueueHealthService } from '../../../src/services/queue-health.service';
import { StorageHealthService } from '../../../src/services/storage-health.service';
import { ExternalServicesHealthService } from '../../../src/services/external-services-health.service';
import { WorkersHealthService } from '../../../src/services/workers-health.service';
import { WebsocketHealthService } from '../../../src/services/websocket-health.service';
import { SystemMetricsService } from '../../../src/services/system-metrics.service';
import { FeatureFlagsHealthService } from '../../../src/services/feature-flags-health.service';
import { ConfigService } from '@nestjs/config';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(async () => {
    const mockHealthyCheck = jest.fn().mockResolvedValue({ status: 'healthy', responseTime: 5 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('1.0.0') } },
        { provide: DatabaseHealthService, useValue: { check: mockHealthyCheck } },
        { provide: CacheHealthService, useValue: { check: mockHealthyCheck } },
        { provide: QueueHealthService, useValue: { check: mockHealthyCheck } },
        { provide: StorageHealthService, useValue: { check: mockHealthyCheck } },
        { provide: ExternalServicesHealthService, useValue: { check: mockHealthyCheck } },
        { provide: WorkersHealthService, useValue: { check: mockHealthyCheck } },
        { provide: WebsocketHealthService, useValue: { check: mockHealthyCheck } },
        { provide: SystemMetricsService, useValue: { getMetrics: jest.fn().mockReturnValue({}) } },
        {
          provide: FeatureFlagsHealthService,
          useValue: { check: jest.fn().mockResolvedValue({ flags: {} }) },
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  describe('getAggregatedHealth', () => {
    it('should return healthy if all checks pass', async () => {
      const result = await service.getAggregatedHealth();
      expect(result.status).toBe('healthy');
      expect(result.checks.database).toBe('pass');
    });
  });

  describe('getReadiness', () => {
    it('should be ready if db, cache, queue are healthy', async () => {
      const result = await service.getReadiness();
      expect(result.status).toBe('ready');
      expect(result.checks.database).toBe(true);
    });
  });
});
