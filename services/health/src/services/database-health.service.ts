import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaReadService as PrismaService } from '@nestlancer/database';
import { LoggerService } from '@nestlancer/logger';
import { HealthCheckResult } from '../interfaces/health-check-result.interface';

@Injectable()
export class DatabaseHealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      const timeoutMs = this.configService.get<number>('healthService.timeouts.database') || 2000;

      // Execute a simple query with timeout
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database query timeout')), timeoutMs),
        ),
      ]);

      const responseTime = Date.now() - startTime;

      // Get connection pool metrics if possible (Prisma metrics must be enabled)
      let metrics;
      try {
        metrics = await (this.prisma as any).$metrics.json();
      } catch (e: any) {
        // Metrics might not be enabled, ignore
      }

      const activeConnections =
        metrics?.counters?.find((c: any) => c.name === 'prisma_pool_connections_busy')?.value || 0;
      const idleConnections =
        metrics?.counters?.find((c: any) => c.name === 'prisma_pool_connections_idle')?.value || 0;
      const totalConnections =
        metrics?.counters?.find((c: any) => c.name === 'prisma_pool_connections_open')?.value || 0;

      return {
        status: 'healthy',
        responseTime,
        details: {
          type: 'PostgreSQL',
          connections: {
            active: activeConnections,
            idle: idleConnections,
            total: totalConnections,
          },
        },
      };
    } catch (error: any) {
      this.logger.error('Database health check failed', error.stack, 'DatabaseHealthService');
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }
}
