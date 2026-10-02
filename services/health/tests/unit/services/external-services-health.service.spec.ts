import { ExternalServicesHealthService } from '../../../src/services/external-services-health.service';

describe('ExternalServicesHealthService', () => {
  let service: ExternalServicesHealthService;

  beforeEach(() => {
    service = new ExternalServicesHealthService();
  });

  describe('check', () => {
    it('should return healthy status', async () => {
      const result = await service.check();
      expect(result.status).toBe('healthy');
      expect(result.responseTime).toBeDefined();
    });

    it('should include external service details', async () => {
      const result = await service.check();
      expect(result.details).toBeDefined();
      expect(result.details.razorpay).toBe('pass');
      expect(result.details.zeptomail).toBe('pass');
    });
  });
});
