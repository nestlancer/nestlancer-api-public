import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiStandardResponses, Public } from '@nestlancer/common';
import { CacheService } from '@nestlancer/cache';

const MAINTENANCE_CACHE_KEY = 'system:maintenance';

/**
 * Public system status — used by client apps to show a maintenance screen.
 */
@ApiTags('System')
@Controller('system')
@ApiStandardResponses()
export class SystemStatusController {
  constructor(private readonly cacheService: CacheService) {}

  @Get('status')
  @Public()
  @ApiOperation({
    summary: 'Public platform status',
    description: 'Returns maintenance mode state for client splash / banner screens.',
  })
  async getStatus() {
    try {
      const state = await this.cacheService.get<{
        enabled?: boolean;
        message?: string;
        estimatedEnd?: string | null;
      }>(MAINTENANCE_CACHE_KEY);

      return {
        maintenance: {
          enabled: Boolean(state?.enabled),
          message: state?.message || null,
          estimatedEnd: state?.estimatedEnd ?? null,
        },
      };
    } catch {
      return { maintenance: { enabled: false, message: null, estimatedEnd: null } };
    }
  }
}
