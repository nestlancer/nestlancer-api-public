import { Injectable, Logger } from '@nestjs/common';
import { HealthCheckResult } from '../interfaces/health-check-result.interface';

@Injectable()
export class WebsocketHealthService {
  private readonly logger = new Logger(WebsocketHealthService.name);

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const wsInternalUrl =
      process.env.WS_GATEWAY_INTERNAL_URL || 'http://ws-gateway:3100/health';

    try {
      const response = await fetch(wsInternalUrl, { signal: AbortSignal.timeout(3000) });
      const isHealthy = response.ok;
      let data: any = {};
      try {
        data = await response.json();
      } catch (e: any) {}

      return {
        status: isHealthy ? 'healthy' : 'degraded',
        responseTime: Date.now() - startTime,
        details: {
          connectedClients: data?.details?.websocket?.connectedClients || 0,
          statusText: response.statusText,
        },
      };
    } catch (error: any) {
      this.logger.warn(`WebSocket Gateway health check failed: ${error.message}`);
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }
}
