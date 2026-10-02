import { Controller, Get } from '@nestjs/common';
import { ApiStandardResponse, ApiStandardResponses, Public } from '@nestlancer/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

/**
 * Health check controller for the webhooks ingestion service.
 */
@ApiTags('Webhooks')
/** Routes mount under global prefix `api/v1/webhooks` — no extra `webhooks` segment. */
@Controller()
@ApiStandardResponses()
export class WebhooksHealthController {
  /**
   * Evaluates the operational status of the inbound Webhooks ingestion service.
   *
   * @returns A promise resolving to the physical health status of the service
   */
  @Public()
  @Get('health')
  @ApiOperation({
    summary: 'Service health check',
    description:
      'Confirm that the inbound webhook ingestion microservice is reachable and operational.',
  })
  @ApiStandardResponse()
  async health(): Promise<any> {
    return { status: 'ok', service: 'webhooks-inbound' };
  }
}
