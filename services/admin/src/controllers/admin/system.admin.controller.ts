import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { ApiStandardResponses, ApiStandardResponse } from '@nestlancer/common';
import { AdminGuard } from '../../guards/admin.guard';

import { SystemConfigService } from '../../services/system-config.service';
import { FeatureFlagsService } from '../../services/feature-flags.service';
import { MaintenanceModeService } from '../../services/maintenance-mode.service';
import { CacheManagementService } from '../../services/cache-management.service';
import { BackgroundJobsService } from '../../services/background-jobs.service';
import { SystemLogsService } from '../../services/system-logs.service';
import { AnnouncementsService } from '../../services/announcements.service';

import { UpdateSystemConfigDto } from '../../dto/update-system-config.dto';
import { ToggleFeatureDto } from '../../dto/toggle-feature.dto';
import { ToggleMaintenanceDto } from '../../dto/toggle-maintenance.dto';
import { ClearCacheDto } from '../../dto/clear-cache.dto';
import { QueryJobsDto } from '../../dto/query-jobs.dto';
import { QueryLogsDto } from '../../dto/query-logs.dto';
import { SendAnnouncementDto } from '../../dto/send-announcement.dto';
import { resolveAdminUserId } from '../../utils/resolve-admin-user-id';

/**
 * Controller for system-wide administrative configuration and maintenance.
 * Provides endpoints for managing system settings, feature flags, maintenance mode,
 * background jobs, cache, and system logs.
 *
 * @category Admin
 */
@ApiTags('Admin - System')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('system')
@ApiStandardResponses()
export class SystemAdminController {
  constructor(
    private readonly configService: SystemConfigService,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly maintenanceService: MaintenanceModeService,
    private readonly cacheService: CacheManagementService,
    private readonly jobsService: BackgroundJobsService,
    private readonly logsService: SystemLogsService,
    private readonly announcementsService: AnnouncementsService,
  ) {}

  // -- Config --
  /**
   * Retrieves the complete system configuration.
   *
   * @returns Object containing all system-level configuration parameters
   */
  @Get('config')
  @ApiOperation({
    summary: 'Get system config',
    description: 'Fetch the current global configuration settings for the entire platform.',
  })
  @ApiStandardResponse({ message: 'System config retrieved' })
  async getConfig(): Promise<any> {
    return this.configService.getAll();
  }

  /**
   * Updates one or more system configuration parameters.
   *
   * @param dto Object containing keys and values to update
   * @param req Express request object for auditing
   * @returns Updated configuration state
   */
  @Patch('config')
  @ApiOperation({
    summary: 'Update system config',
    description:
      'Modify global system settings. These changes take effect immediately across the platform.',
  })
  @ApiStandardResponse({ message: 'System config updated' })
  async updateConfig(@Body() dto: UpdateSystemConfigDto, @Req() req: any): Promise<any> {
    const updatedBy = resolveAdminUserId(req);
    return this.configService.set(dto, updatedBy);
  }

  // -- Features --
  /**
   * Retrieves a list of all feature flags and their current status.
   *
   * @returns Array of active feature flags
   */
  @Get('features')
  @ApiOperation({
    summary: 'List feature flags',
    description: 'Retrieve all feature flags and their current enablement status for the system.',
  })
  @ApiStandardResponse({ message: 'Feature flags retrieved' })
  async listFeatures(): Promise<any> {
    return this.featureFlagsService.findAll();
  }

  /**
   * Enables or disables a specific system feature flag.
   *
   * @param flag The unique key of the feature flag to toggle
   * @param dto The target state of the feature
   * @returns Updated feature flag status
   */
  @Patch('features/:flag')
  @ApiOperation({
    summary: 'Toggle feature flag',
    description: 'Enable or disable a specific feature globally based on its unique identifier.',
  })
  @ApiStandardResponse({ message: 'Feature flag toggled' })
  async toggleFeature(@Param('flag') flag: string, @Body() dto: ToggleFeatureDto): Promise<any> {
    return this.featureFlagsService.toggleFeature(flag, dto.enabled, {
      description: dto.description,
      rolloutPercentage: dto.rolloutPercentage,
    });
  }

  // -- Maintenance --
  /**
   * Toggles system maintenance mode status.
   *
   * @param dto Activation/deactivation settings and explanatory message
   * @param req Express request object for auditing
   * @returns Result of the maintenance mode toggle
   */
  @Post('maintenance')
  @ApiOperation({
    summary: 'Toggle maintenance mode',
    description:
      'Put the platform into maintenance mode or bring it back online. Affects public access.',
  })
  @ApiStandardResponse({ message: 'Maintenance mode toggled' })
  async toggleMaintenance(@Body() dto: ToggleMaintenanceDto, @Req() req: any): Promise<any> {
    return this.maintenanceService.toggle(dto, resolveAdminUserId(req));
  }

  // -- Cache --
  /**
   * Clears specific cache entries or the entire system cache.
   *
   * @param dto Configuration for cache clearing (key pattern, tags)
   * @returns Success confirmation
   */
  @Post('cache/clear')
  @ApiOperation({
    summary: 'Clear cache',
    description:
      'Purge data from the system cache based on provided patterns or clear the entire object store.',
  })
  @ApiStandardResponse()
  async clearCache(@Body() dto: ClearCacheDto): Promise<any> {
    return this.cacheService.clearCache(dto);
  }

  /**
   * Clears a specific cache entry by its exact key.
   *
   * @param key The unique identifier of the cache entry to remove
   * @returns Success confirmation
   */
  @Post('cache/clear/:key')
  @ApiOperation({
    summary: 'Clear specific cache key',
    description: 'Immediately invalidate and remove a specific data entry from the system cache.',
  })
  @ApiStandardResponse()
  async clearCacheKey(@Param('key') key: string): Promise<any> {
    return this.cacheService.clearCache({ keyPattern: key });
  }

  // -- Jobs --
  /**
   * Retrieves a paginated list of background job executions.
   *
   * @param query Filters for job status, type, and date range
   * @returns Paginated list of background jobs
   */
  @Get('jobs')
  @ApiOperation({
    summary: 'List background jobs',
    description: 'Retrieve a history and current status of asynchronous background processes.',
  })
  @ApiStandardResponse({ message: 'Jobs retrieved' })
  async listJobs(@Query() query: QueryJobsDto): Promise<any> {
    return this.jobsService.findAll(query);
  }

  /**
   * Retries a failed background job execution.
   *
   * @param id The unique identifier of the failed job
   * @returns Result of the retry attempt
   */
  @Post('jobs/:id/retry')
  @ApiOperation({
    summary: 'Retry failed job',
    description: 'Manually re-trigger a background job that previously encountered an error.',
  })
  @ApiStandardResponse()
  async retryJob(@Param('id') id: string): Promise<any> {
    return this.jobsService.retryJob(id);
  }

  /**
   * Cancels a pending or currently executing background job.
   *
   * @param id The unique identifier of the job to cancel
   * @returns Confirmation of job cancellation
   */
  @Delete('jobs/:id')
  @ApiOperation({
    summary: 'Cancel job',
    description: 'Stop a scheduled or running background job and prevent future executions.',
  })
  @ApiStandardResponse()
  async cancelJob(@Param('id') id: string): Promise<any> {
    return this.jobsService.cancelJob(id);
  }

  // -- Logs --
  /**
   * Queries application and system logs with advanced filtering.
   *
   * @param query Filters for log level, service, source, and time
   * @returns Paginated set of matching log entries
   */
  @Get('logs')
  @ApiOperation({
    summary: 'View system logs',
    description:
      'Access centralized application and infrastructure logs for debugging and auditing.',
  })
  @ApiStandardResponse({ message: 'Logs retrieved' })
  async getLogs(@Query() query: QueryLogsDto): Promise<any> {
    return this.logsService.queryLogs(query);
  }

  /**
   * Generates a download link for filtered system logs.
   *
   * @param query Filters to select logs for export
   * @returns Object containing the pre-signed download URL
   */
  @Get('logs/download')
  @ApiOperation({
    summary: 'Download logs',
    description: 'Generate a downloadable archive of system logs matching specific criteria.',
  })
  @ApiStandardResponse({ message: 'Log download URL generated' })
  async downloadLogs(@Query() query: QueryLogsDto): Promise<any> {
    return this.logsService.generateDownloadLink(query);
  }

  // -- Announcements --
  /**
   * Sends a system-wide announcement to all users or specific segments.
   *
   * @param dto Announcement content, target audience, and severity
   * @param req Express request object for sender identification
   * @returns The created announcement object
   */
  @Post('announcements')
  @ApiOperation({
    summary: 'Send system announcement',
    description: 'Publish a global notification or announcement to the user dashboard.',
  })
  @ApiStandardResponse({ message: 'Announcement sent' })
  async sendAnnouncement(@Body() dto: SendAnnouncementDto, @Req() req: any): Promise<any> {
    return this.announcementsService.send(dto, resolveAdminUserId(req));
  }
}
