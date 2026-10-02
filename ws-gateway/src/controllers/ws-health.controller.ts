import { Controller, Get } from '@nestjs/common';
import { Public } from '@nestlancer/common';

/**
 * HTTP liveness probe for the WebSocket gateway (Docker / orchestrator healthchecks).
 */
@Controller()
export class WsHealthController {
  @Public()
  @Get('health')
  health(): { status: string; service: string } {
    return { status: 'ok', service: 'ws-gateway' };
  }
}
