import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';

import { firstValueFrom } from 'rxjs';

import { getServiceConfig, getServiceNames, ServiceConfig } from '../../proxy';

export interface ServiceHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  url: string;
  responseTime: number;
  error?: string;
}

export interface HealthCheckResult {
  status: 'up' | 'down' | 'degraded';
  timestamp: string;
  uptime: number;
  services: ServiceHealth[];
  summary: {
    total: number;
    up: number;
    down: number;
    degraded: number;
  };
}

/**
 * Health Service
 * Aggregates health checks from all microservices
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private startTime: number;

  constructor(private readonly httpService: HttpService) {
    this.startTime = Date.now();
  }

  /**
   * Get gateway health status
   */
  getGatewayHealth(): { status: string; timestamp: string } {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check all service health endpoints
   */
  async checkAllServices(): Promise<HealthCheckResult> {
    const serviceNames = getServiceNames();
    const services: ServiceHealth[] = [];

    // Check all services in parallel
    const checkPromises = serviceNames.map((name) => this.checkService(name));
    const results = await Promise.allSettled(checkPromises);

    results.forEach((result, index) => {
      const serviceName = serviceNames[index];
      if (result.status === 'fulfilled') {
        services.push(result.value);
      } else {
        services.push({
          name: serviceName,
          status: 'down',
          url: getServiceConfig(serviceName)?.url || 'unknown',
          responseTime: 0,
          error: result.reason?.message || 'Unknown error',
        });
      }
    });

    // Calculate overall status
    const up = services.filter((s) => s.status === 'up').length;
    const down = services.filter((s) => s.status === 'down').length;
    const degraded = services.filter((s) => s.status === 'degraded').length;

    let status: 'up' | 'down' | 'degraded' = 'up';
    if (down > 0) {
      status = down === services.length ? 'down' : 'degraded';
    } else if (degraded > 0) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: (Date.now() - this.startTime) / 1000,
      services,
      summary: {
        total: services.length,
        up,
        down,
        degraded,
      },
    };
  }

  /**
   * Check a single service health
   */
  private async checkService(name: string): Promise<ServiceHealth> {
    const config = getServiceConfig(name);
    if (!config) {
      throw new Error(`Service ${name} not found in registry`);
    }

    const healthUrl = `${config.url}${config.healthEndpoint}`;
    const startTime = Date.now();

    try {
      const response = await firstValueFrom(
        this.httpService.get(healthUrl, {
          timeout: config.timeout,
          validateStatus: () => true,
        }),
      );

      const responseTime = Date.now() - startTime;
      const isHealthy = response.status >= 200 && response.status < 300;

      return {
        name,
        status: isHealthy ? 'up' : 'degraded',
        url: config.url,
        responseTime,
        error: isHealthy ? undefined : `HTTP ${response.status}`,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      this.logger.warn(`Health check failed for ${name}: ${(error as Error).message}`);

      return {
        name,
        status: 'down',
        url: config.url,
        responseTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Check if a specific service is healthy
   */
  async isServiceHealthy(name: string): Promise<boolean> {
    try {
      const result = await this.checkService(name);
      return result.status === 'up';
    } catch {
      return false;
    }
  }

  /**
   * Get readiness status
   * Returns true if critical services are up
   */
  async isReady(): Promise<{ ready: boolean; criticalServices: string[] }> {
    const criticalServices = ['auth', 'users'];
    const results = await Promise.all(
      criticalServices.map(async (name) => ({
        name,
        healthy: await this.isServiceHealthy(name),
      })),
    );

    const allHealthy = results.every((r) => r.healthy);
    return {
      ready: allHealthy,
      criticalServices: results.filter((r) => !r.healthy).map((r) => r.name),
    };
  }
}
