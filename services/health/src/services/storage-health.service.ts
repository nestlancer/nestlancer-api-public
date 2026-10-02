import { Injectable } from '@nestjs/common';
import { LoggerService } from '@nestlancer/logger';
import { StorageService } from '@nestlancer/storage';
import { HealthCheckResult } from '../interfaces/health-check-result.interface';

@Injectable()
export class StorageHealthService {
  constructor(
    private readonly logger: LoggerService,
    private readonly storageService: StorageService,
  ) {}

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      await this.storageService.exists('nestlancer-public', '.healthcheck');

      const responseTime = Date.now() - startTime;
      return {
        status: 'healthy',
        responseTime: responseTime > 0 ? responseTime : 5,
        details: {
          connected: true,
          provider: process.env.STORAGE_PROVIDER || 'local',
        },
      };
    } catch (error: any) {
      this.logger.error('Storage health check failed', error.stack, 'StorageHealthService');
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }
}
