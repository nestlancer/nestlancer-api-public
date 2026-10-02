import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseBoolPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaAdminService } from './media-admin.service';
import { QueryMediaDto, MediaVisibilityFilter } from '../dto/query-media.dto';
import { AdminUpdateMediaDto } from '../dto/admin-update-media.dto';
import { BulkDeleteMediaDto } from '../dto/bulk-delete-media.dto';
import { ShareMediaDto } from '../dto/share-media.dto';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  CurrentUser,
  AuthenticatedUser,
} from '@nestlancer/auth-lib';
import { ApiStandardResponse, ApiStandardResponses, UserRole } from '@nestlancer/common';
import { PrismaWriteService } from '@nestlancer/database';
import { MediaPortfolioPromoteService } from './media-portfolio-promote.service';
import { PromotePortfolioMediaDto } from '../dto/promote-portfolio-media.dto';

import { ApiTags, ApiOperation, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';

/**
 * Administrative controller for global media management.
 * Provides endpoints for oversight, analytics, and moderation of all media assets.
 *
 * @category Media
 */
@ApiTags('Media - Admin')
@ApiBearerAuth()
@Controller('admin/media')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiStandardResponses()
export class MediaAdminController {
  constructor(
    private readonly adminService: MediaAdminService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly portfolioPromote: MediaPortfolioPromoteService,
  ) {}

  /**
   * Retrieves a paginated list of all media files in the system.
   */
  @Get()
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'List all media',
    description: 'Administrative view of all media files uploaded across all users.',
  })
  async getAllMedia(@Query() query: QueryMediaDto): Promise<any> {
    if (
      query.contextType === 'delivery' ||
      query.contextType === 'deliverable' ||
      query.contextType === 'project'
    ) {
      try {
        await this.adminService.backfillDeliverableContexts();
      } catch {
        // Listing should still succeed if backfill fails.
      }
    }
    return this.adminService.findAll(query);
  }

  /**
   * Returns folder structure for cloud-style storage browser (DB aggregates only, no S3 URLs).
   */
  @Get('browse')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Browse storage folders',
    description:
      'Returns bucket/user/category folder tree for the admin storage browser. Metadata only — no presigned URLs.',
  })
  async browseStorage(
    @Query('visibility') visibility?: MediaVisibilityFilter,
    @Query('uploaderId') uploaderId?: string,
    @Query('search') search?: string,
  ): Promise<any> {
    return this.adminService.getBrowseFolders({ visibility, uploaderId, search });
  }

  @Post('promote-to-portfolio')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Promote project deliverable media to public portfolio',
    description: 'Copies a private deliverable attachment into a public portfolio media record.',
  })
  async promoteToPortfolio(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PromotePortfolioMediaDto,
  ): Promise<any> {
    return this.portfolioPromote.promote(user.userId, dto);
  }

  /**
   * Lists media files belonging to a specific user.
   */
  @Get('users/:userId')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'List user media (admin)',
    description: "View another user's media library with administrative privileges.",
  })
  async getUserMedia(@Param('userId') userId: string, @Query() query: QueryMediaDto): Promise<any> {
    // Per-client inventory: uploads + project/message/delivery files related to this user.
    return this.adminService.findAll({ ...query, relatedToUserId: userId, uploaderId: undefined });
  }

  /**
   * Retrieves media files that are currently in quarantine (e.g., suspected malware).
   */
  @Get('quarantine')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'List quarantined media',
    description: 'Review media files that have been flagged as potentially harmful.',
  })
  async getQuarantinedMedia(@Query() query: QueryMediaDto): Promise<any> {
    return this.adminService.findQuarantined(query);
  }

  /**
   * Retrieves global storage utilization analytics.
   */
  @Get('analytics')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Get storage analytics',
    description: 'View global statistics on storage consumption, file types, and trends.',
  })
  async getStorageAnalytics(): Promise<any> {
    return this.adminService.getAnalytics();
  }

  /** @deprecated Use GET /admin/media/analytics — omitted from OpenAPI to avoid duplicate operationId. */
  @Get('storage/analytics')
  @ApiExcludeEndpoint()
  async getStorageAnalyticsLegacyPath(): Promise<any> {
    return this.adminService.getAnalytics();
  }

  /**
   * Simple view of aggregate storage usage.
   */
  @Get('storage-usage')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Get storage usage',
    description: 'Fetch a concise summary of current disk space usage.',
  })
  async getStorageUsage(): Promise<any> {
    return this.adminService.getAnalytics();
  }

  /** NL-BUG-UI-014: aliases expected by the operator console. */
  @Get('storage-stats')
  @ApiStandardResponse(Object)
  @ApiOperation({ summary: 'Get storage stats (alias of storage-usage)' })
  async getStorageStatsAlias(): Promise<any> {
    return this.adminService.getAnalytics();
  }

  @Get('stats')
  @ApiStandardResponse(Object)
  @ApiOperation({ summary: 'Get media stats (alias of analytics)' })
  async getStatsAlias(): Promise<any> {
    return this.adminService.getAnalytics();
  }

  @Get('orphans')
  @ApiStandardResponse(Object)
  @ApiOperation({ summary: 'List orphan storage objects' })
  async listOrphans(): Promise<any> {
    const orphans = await this.adminService.listOrphans();
    return { items: orphans, total: Array.isArray(orphans) ? orphans.length : 0 };
  }

  /**
   * Triggers a cleanup process for unattached or orphaned storage assets.
   */
  @Post('cleanup')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Run storage cleanup',
    description: 'Manually trigger the removal of orphaned files and temporary upload remnants.',
  })
  async runCleanup(
    @CurrentUser() user: AuthenticatedUser,
    @Query('dryRun', new DefaultValuePipe(false), ParseBoolPipe) dryRun: boolean,
  ): Promise<any> {
    return this.adminService.cleanupOrphans(dryRun, user.userId);
  }

  @Post('backfill-context')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Backfill deliverable media context',
    description:
      'Sets contextType=project and contextId from deliverable→milestone→project for media missing context.',
  })
  async backfillContext(): Promise<any> {
    return this.adminService.backfillDeliverableContexts();
  }

  /**
   * Deletes multiple media files in one request.
   */
  @Post('bulk-delete')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Bulk delete media',
    description: 'Delete multiple media files with optional force override for references.',
  })
  async bulkDeleteMedia(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkDeleteMediaDto,
  ): Promise<any> {
    return this.adminService.bulkDelete(dto, user.userId);
  }

  /**
   * Updates global media service settings.
   */
  @Patch('settings')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Update media settings',
    description: 'Configure global upload limits, allowed MIME types, and processing rules.',
  })
  async updateSettings(@Body() body: any): Promise<any> {
    await this.prismaWrite.systemConfig.upsert({
      where: { key: 'media.settings' },
      update: { value: body },
      create: { key: 'media.settings', value: body, description: 'Global Media Settings' },
    });
    return { updated: true, settings: body };
  }

  /**
   * Releases a media file from quarantine after it has been verified as safe.
   */
  @Post('quarantine/:id/release')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Release from quarantine',
    description: 'Restore a flagged file to its normal state after verification.',
  })
  async releaseQuarantinedMedia(@Param('id') id: string): Promise<any> {
    return this.adminService.releaseQuarantined(id);
  }

  /**
   * Permanently deletes a quarantined media file.
   */
  @Delete('quarantine/:id')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Purge quarantined media',
    description: 'Permanently remove a hazardous file from the system.',
  })
  async deleteQuarantinedMedia(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('force', new DefaultValuePipe(true), ParseBoolPipe) force: boolean,
  ): Promise<any> {
    await this.adminService.deleteAny(id, { force, adminId: user.userId });
    return { status: 'success', message: `Quarantined media ${id} permanently deleted` };
  }

  @Get(':id/download')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Get media download URL (admin)',
    description: 'Generate a presigned download URL for any file in the system.',
  })
  async getMediaDownloadUrl(@Param('id') id: string): Promise<any> {
    return this.adminService.getDownloadUrl(id);
  }

  @Get(':id/references')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Get media references (admin)',
    description: 'List resources that reference this media file.',
  })
  async getMediaReferences(@Param('id') id: string): Promise<any> {
    return this.adminService.getReferences(id);
  }

  @Get(':id/shares')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Get media share links (admin)',
    description: 'List active share links for a media file.',
  })
  async getMediaShares(@Param('id') id: string): Promise<any> {
    return this.adminService.getShares(id);
  }

  @Post(':id/share')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Create share link (admin)',
    description: 'Generate a public share link for any media file.',
  })
  async createMediaShare(@Param('id') id: string, @Body() dto: ShareMediaDto): Promise<any> {
    return this.adminService.createShare(id, dto);
  }

  @Delete(':id/share')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Revoke all share links (admin)',
    description: 'Remove every active share link for a media file.',
  })
  async revokeMediaShares(@Param('id') id: string): Promise<any> {
    return this.adminService.revokeShares(id);
  }

  @Delete(':id/shares/:shareLinkId')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Revoke one share link (admin)',
    description: 'Remove a single share link by ID.',
  })
  async revokeMediaShareById(
    @Param('id') id: string,
    @Param('shareLinkId') shareLinkId: string,
  ): Promise<any> {
    return this.adminService.revokeShareById(id, shareLinkId);
  }

  /**
   * Retrieves full details for any media asset in the system.
   */
  @Get(':id')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Get media details (admin)',
    description: 'Retrieve comprehensive metadata for any file by its ID.',
  })
  async getMediaDetails(@Param('id') id: string): Promise<any> {
    return this.adminService.findById(id);
  }

  /**
   * Manually triggers file reprocessing (e.g., after updating processing logic).
   */
  @Post(':id/reprocess')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Reprocess media',
    description: 'Restart automated processing (e.g., thumbnailing, virus scanning) for a file.',
  })
  async reprocessMedia(@Param('id') id: string): Promise<any> {
    return this.adminService.reprocess(id);
  }

  /**
   * Replaces the underlying file for an existing media record.
   */
  @Post(':id/replace')
  @UseInterceptors(FileInterceptor('file'))
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Replace media file (admin)',
    description: 'Upload a new file to replace an existing media asset.',
  })
  async replaceMediaFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Query('force', new DefaultValuePipe(false), ParseBoolPipe) force: boolean,
  ): Promise<any> {
    return this.adminService.replaceFile(id, file, user.userId, { force });
  }

  /**
   * Updates metadata for any media file in the system.
   */
  @Patch(':id')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Update media metadata (admin)',
    description: 'Patch filename, visibility, and metadata for any media file.',
  })
  async updateMediaMetadata(
    @Param('id') id: string,
    @Body() dto: AdminUpdateMediaDto,
  ): Promise<any> {
    return this.adminService.updateMetadata(id, dto);
  }

  /**
   * Deletes any media file in the system regardless of ownership.
   */
  @Delete(':id')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Force delete media',
    description: 'Administrative deletion of any media file and its assets.',
  })
  async deleteMedia(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('force', new DefaultValuePipe(false), ParseBoolPipe) force: boolean,
  ): Promise<any> {
    return this.adminService.deleteAny(id, { force, adminId: user.userId });
  }
}
