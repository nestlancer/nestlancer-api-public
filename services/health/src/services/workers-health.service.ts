import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '@nestlancer/cache';
import { HealthCheckResult } from '../interfaces/health-check-result.interface';

@Injectable()
export class WorkersHealthService {
  private readonly logger = new Logger(WorkersHealthService.name);

  constructor(private readonly cacheService: CacheService) {}

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Retrieve worker heartbeats from Redis registry
      const workers = [
        'analyticsWorker',
        'auditWorker',
        'cdnWorker',
        'documentWorker',
        'emailWorker',
        'exportWorker',
        'mediaWorker',
        'notificationWorker',
        'outboxPoller',
        'webhookWorker',
      ];
      const details: any = { activeWorkers: 0 };
      let allHealthy = true;

      for (const worker of workers) {
        const lastHeartbeat = await this.cacheService.get(`worker_heartbeat:${worker}`);
        if (lastHeartbeat != null) {
          const heartbeatMs =
            typeof lastHeartbeat === 'number'
              ? lastHeartbeat
              : parseInt(String(lastHeartbeat), 10);
          const diff = Date.now() - heartbeatMs;
          const isHealthy = diff < 60000;
          details[worker] = isHealthy ? 'healthy' : 'degraded';
          if (!isHealthy) allHealthy = false;
          details.activeWorkers++;
        } else {
          details[worker] = 'unknown';
          allHealthy = false;
        }
      }

      return {
        status: allHealthy ? 'healthy' : 'degraded',
        responseTime: Date.now() - startTime,
        details,
      };
    } catch (error: any) {
      this.logger.error('Worker health check failed', error.stack, 'WorkersHealthService');
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }
}
