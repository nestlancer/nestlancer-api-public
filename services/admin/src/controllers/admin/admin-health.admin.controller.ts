import { Controller, Get } from '@nestjs/common';
import { ApiStandardResponses, Public } from '@nestlancer/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

/**
 * Lightweight operator-console probe; gateway maps GET /api/v1/admin/health → /api/health.
 */
@ApiTags('Admin - Health')
@Controller()
@ApiStandardResponses()
export class AdminHealthAdminController {
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Admin service health' })
  health(): { ok: boolean; service: string } {
    return { ok: true, service: 'admin' };
  }
}
