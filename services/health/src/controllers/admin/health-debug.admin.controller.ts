import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiStandardResponses, Roles, UserRole } from '@nestlancer/common';
import { HealthService } from '../../services/health.service';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';

import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

/**
 * Administrative controller for accessing advanced system health and debug information.
 *
 * @category Monitoring
 */
@ApiTags('Health - Admin Debug')
@ApiBearerAuth()
@Controller('debug')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiStandardResponses()
export class HealthDebugAdminController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Retrieves comprehensive, low-level internal diagnostic information.
   * This endpoint provides detailed metadata regarding the runtime environment,
   * including sensitive trace information for administrative analysis.
   *
   * @returns A promise resolving to extended system debug metadata
   */
  @Get()
  @ApiOperation({
    summary: 'Retrieve system debug logs',
    description:
      'Access deep-trace diagnostics and environment metadata for architectural troubleshooting.',
  })
  @ApiResponse({ status: 200, description: 'Verbose debug information retrieved successfully' })
  async getDebugInfo(): Promise<any> {
    return this.healthService.getDebugHealth();
  }
}
