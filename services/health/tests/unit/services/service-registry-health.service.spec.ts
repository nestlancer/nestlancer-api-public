import { Test, TestingModule } from '@nestjs/testing';
import { ServiceRegistryHealthService } from '../../../src/services/service-registry-health.service';

describe('ServiceRegistryHealthService', () => {
  let service: ServiceRegistryHealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServiceRegistryHealthService],
    }).compile();

    service = module.get<ServiceRegistryHealthService>(ServiceRegistryHealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('check', () => {
    it('should return healthy status with registry details', async () => {
      const result = await service.check();

      expect(result.status).toBe('healthy');
      expect(result.details?.servicesRegistered).toBeDefined();
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });
  });
});
