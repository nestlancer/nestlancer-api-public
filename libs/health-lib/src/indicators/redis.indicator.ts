import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RedisHealthIndicator {
  private readonly logger = new Logger(RedisHealthIndicator.name);

  async check(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    details?: Record<string, unknown>;
  }> {
    const start = Date.now();
    try {
      // In production: actual health check for redis
      return { status: 'healthy', responseTime: Date.now() - start };
    } catch (error) {
      this.logger.error('redis health check failed:', error);
      return {
        status: 'unhealthy',
        responseTime: Date.now() - start,
        details: { error: String(error) },
      };
    }
  }
}
