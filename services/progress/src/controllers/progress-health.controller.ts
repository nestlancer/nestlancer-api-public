import { Controller, Get } from '@nestjs/common';
import { ApiStandardResponses, Public } from '@nestlancer/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

/**
 * Liveness probe for the progress microservice.
 */
@ApiTags('Progress')
@Controller('progress')
@ApiStandardResponses()
export class ProgressHealthController {
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Progress service health check' })
  health(): { status: string; service: string } {
    return { status: 'ok', service: 'progress' };
  }
}
