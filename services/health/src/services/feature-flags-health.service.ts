import { Injectable } from '@nestjs/common';

@Injectable()
export class FeatureFlagsHealthService {
  async check() {
    return {
      status: 'healthy' as const,
      flags: {
        newDashboard: true,
        advancedAnalytics: false,
        betaFeatures: true,
      },
    };
  }
}
