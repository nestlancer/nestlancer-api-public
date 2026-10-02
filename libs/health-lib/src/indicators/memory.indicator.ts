import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MemoryHealthIndicator {
  private readonly logger = new Logger(MemoryHealthIndicator.name);

  async check(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    details?: Record<string, unknown>;
  }> {
    const start = Date.now();
    try {
      // In production: actual health check for memory
      return { status: 'healthy', responseTime: Date.now() - start };
    } catch (error) {
      this.logger.error('memory health check failed:', error);
      return {
        status: 'unhealthy',
        responseTime: Date.now() - start,
        details: { error: String(error) },
      };
    }
  }
}
