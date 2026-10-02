import { FeatureFlagsHealthService } from '../../../src/services/feature-flags-health.service';

describe('FeatureFlagsHealthService', () => {
  let service: FeatureFlagsHealthService;

  beforeEach(() => {
    service = new FeatureFlagsHealthService();
  });

  describe('check', () => {
    it('should return healthy status', async () => {
      const result = await service.check();
      expect(result.status).toBe('healthy');
    });

    it('should return feature flag values', async () => {
      const result = await service.check();
      expect(result.flags).toBeDefined();
      expect(result.flags.newDashboard).toBe(true);
      expect(result.flags.advancedAnalytics).toBe(false);
      expect(result.flags.betaFeatures).toBe(true);
    });
  });
});
