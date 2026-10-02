import { Test, TestingModule } from '@nestjs/testing';
import { HealthPublicController } from '../../../src/controllers/public/health.public.controller';
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
import { ServiceRegistryHealthService } from '../../../src/services/service-registry-health.service';
import { Response } from 'express';

describe('HealthPublicController', () => {
  let controller: HealthPublicController;
  let healthService: HealthService;

  const mockResponse = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthPublicController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            getAggregatedHealth: jest.fn(),
            getReadiness: jest.fn(),
            getLiveness: jest.fn(),
          },
        },
        { provide: DatabaseHealthService, useValue: { check: jest.fn() } },
        { provide: CacheHealthService, useValue: { check: jest.fn() } },
        { provide: QueueHealthService, useValue: { check: jest.fn() } },
        { provide: StorageHealthService, useValue: { check: jest.fn() } },
        { provide: ExternalServicesHealthService, useValue: { check: jest.fn() } },
        { provide: WorkersHealthService, useValue: { check: jest.fn() } },
        { provide: WebsocketHealthService, useValue: { check: jest.fn() } },
        { provide: SystemMetricsService, useValue: { getMetrics: jest.fn() } },
        { provide: FeatureFlagsHealthService, useValue: { check: jest.fn() } },
        { provide: ServiceRegistryHealthService, useValue: { check: jest.fn() } },
      ],
    }).compile();

    controller = module.get<HealthPublicController>(HealthPublicController);
    healthService = module.get<HealthService>(HealthService);
  });

  describe('getAggregatedHealth', () => {
    it('should return 200 OK when healthy', async () => {
      const mockHealthResult: any = { status: 'healthy', timestamp: '2024-01-01' };
      jest.spyOn(healthService, 'getAggregatedHealth').mockResolvedValue(mockHealthResult);

      const res = mockResponse();
      await controller.getAggregatedHealth(res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockHealthResult);
    });

    it('should return 503 SERVICE UNAVAILABLE when unhealthy', async () => {
      const mockHealthResult: any = { status: 'unhealthy', timestamp: '2024-01-01' };
      jest.spyOn(healthService, 'getAggregatedHealth').mockResolvedValue(mockHealthResult);

      const res = mockResponse();
      await controller.getAggregatedHealth(res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(mockHealthResult);
    });

    it('should return 206 PARTIAL CONTENT when degraded', async () => {
      const mockHealthResult: any = { status: 'degraded', timestamp: '2024-01-01' };
      jest.spyOn(healthService, 'getAggregatedHealth').mockResolvedValue(mockHealthResult);

      const res = mockResponse();
      await controller.getAggregatedHealth(res);

      expect(res.status).toHaveBeenCalledWith(206);
      expect(res.json).toHaveBeenCalledWith(mockHealthResult);
    });
  });

  describe('ping', () => {
    it('should return empty 200', async () => {
      await expect(controller.ping()).resolves.toBeUndefined();
    });
  });
});
