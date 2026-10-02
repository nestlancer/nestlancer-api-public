import { Test, TestingModule } from '@nestjs/testing';
import { HealthPublicController } from '../../../../src/controllers/public/health.public.controller';
import { HealthService } from '../../../../src/services/health.service';
import { DatabaseHealthService } from '../../../../src/services/database-health.service';
import { CacheHealthService } from '../../../../src/services/cache-health.service';
import { QueueHealthService } from '../../../../src/services/queue-health.service';
import { StorageHealthService } from '../../../../src/services/storage-health.service';
import { ExternalServicesHealthService } from '../../../../src/services/external-services-health.service';
import { WorkersHealthService } from '../../../../src/services/workers-health.service';
import { WebsocketHealthService } from '../../../../src/services/websocket-health.service';
import { SystemMetricsService } from '../../../../src/services/system-metrics.service';
import { FeatureFlagsHealthService } from '../../../../src/services/feature-flags-health.service';
import { ServiceRegistryHealthService } from '../../../../src/services/service-registry-health.service';

describe('HealthPublicController', () => {
  let controller: HealthPublicController;

  const mockHealthService = {};
  const mockDbHealth = {};
  const mockCacheHealth = {};
  const mockQueueHealth = {};
  const mockStorageHealth = {};
  const mockExternalHealth = {};
  const mockWorkersHealth = {};
  const mockWsHealth = {};
  const mockMetricsService = {};
  const mockFeatureFlags = {};
  const mockRegistryHealth = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthPublicController],
      providers: [
        { provide: HealthService, useValue: mockHealthService },
        { provide: DatabaseHealthService, useValue: mockDbHealth },
        { provide: CacheHealthService, useValue: mockCacheHealth },
        { provide: QueueHealthService, useValue: mockQueueHealth },
        { provide: StorageHealthService, useValue: mockStorageHealth },
        { provide: ExternalServicesHealthService, useValue: mockExternalHealth },
        { provide: WorkersHealthService, useValue: mockWorkersHealth },
        { provide: WebsocketHealthService, useValue: mockWsHealth },
        { provide: SystemMetricsService, useValue: mockMetricsService },
        { provide: FeatureFlagsHealthService, useValue: mockFeatureFlags },
        { provide: ServiceRegistryHealthService, useValue: mockRegistryHealth },
      ],
    }).compile();

    controller = module.get<HealthPublicController>(HealthPublicController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
