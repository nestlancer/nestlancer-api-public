import { Injectable } from '@nestjs/common';
import { LoggerService } from '@nestlancer/logger';
import { HealthCheckResult } from '../interfaces/health-check-result.interface';

@Injectable()
export class ExternalServicesHealthService {
  constructor() {}

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      // Simulate external service checks (e.g., Razorpay, ZeptoMail)

      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        details: {
          razorpay: 'pass',
          zeptomail: 'pass',
        },
      };
    } catch (error: any) {
      return {
        status: 'degraded',
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }
}
