import { Controller, Delete, Get, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { Request } from 'express';

import { Roles } from '@nestlancer/auth-lib';
import { UserRole, ApiStandardResponses } from '@nestlancer/common';

import { HttpProxyService } from '../../proxy';

/**
 * Proxies /api/v1/admin/media/* to the media microservice (not the admin service).
 * Routes are declared explicitly so Nest registers subpaths (catch-all @All('*') is unreliable).
 */
@Controller('admin/media')
@ApiTags('media-admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@ApiStandardResponses()
export class MediaAdminGatewayController {
  constructor(private readonly proxy: HttpProxyService) {}

  private forward(req: Request) {
    return this.proxy.forward('media', req);
  }

  @Get()
  @ApiOperation({ summary: 'List all media (admin)' })
  listAll(@Req() req: Request) {
    return this.forward(req);
  }

  @Get('browse')
  @ApiOperation({ summary: 'Browse storage folders (admin)' })
  browseStorage(@Req() req: Request) {
    return this.forward(req);
  }

  @Get('quarantine')
  @ApiOperation({ summary: 'List quarantined media' })
  listQuarantined(@Req() req: Request) {
    return this.forward(req);
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'List media for a user (admin)' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  listUserMedia(@Req() req: Request) {
    return this.forward(req);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Storage analytics' })
  getAnalytics(@Req() req: Request) {
    return this.forward(req);
  }

  @Get('storage/analytics')
  @ApiOperation({ summary: 'Storage analytics (legacy path)' })
  getAnalyticsLegacy(@Req() req: Request) {
    return this.forward(req);
  }

  @Get('storage-usage')
  @ApiOperation({ summary: 'Storage usage summary' })
  getStorageUsage(@Req() req: Request) {
    return this.forward(req);
  }

  /** NL-BUG-UI-014: console paths that previously 404'd. */
  @Get('storage-stats')
  @ApiOperation({ summary: 'Storage stats (alias of storage-usage)' })
  getStorageStats(@Req() req: Request) {
    return this.forward(req);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Media stats (alias of analytics)' })
  getStats(@Req() req: Request) {
    return this.forward(req);
  }

  @Get('orphans')
  @ApiOperation({ summary: 'List orphan storage objects' })
  listOrphans(@Req() req: Request) {
    return this.forward(req);
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Run storage cleanup' })
  runCleanup(@Req() req: Request) {
    return this.forward(req);
  }

  @Post('backfill-context')
  @ApiOperation({ summary: 'Backfill deliverable media context tags' })
  backfillContext(@Req() req: Request) {
    return this.forward(req);
  }

  @Post('bulk-delete')
  @ApiOperation({ summary: 'Bulk delete media' })
  bulkDelete(@Req() req: Request) {
    return this.forward(req);
  }

  @Post('promote-to-portfolio')
  @ApiOperation({ summary: 'Promote deliverable media to public portfolio' })
  promoteToPortfolio(@Req() req: Request) {
    return this.forward(req);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update media settings' })
  updateSettings(@Req() req: Request) {
    return this.forward(req);
  }

  @Post('quarantine/:id/release')
  @ApiOperation({ summary: 'Release media from quarantine' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  releaseQuarantined(@Req() req: Request) {
    return this.forward(req);
  }

  @Delete('quarantine/:id')
  @ApiOperation({ summary: 'Delete quarantined media' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  deleteQuarantined(@Req() req: Request) {
    return this.forward(req);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get media download URL (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  getDownload(@Req() req: Request) {
    return this.forward(req);
  }

  @Get(':id/references')
  @ApiOperation({ summary: 'Get media references (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  getReferences(@Req() req: Request) {
    return this.forward(req);
  }

  @Get(':id/shares')
  @ApiOperation({ summary: 'Get media share links (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  getShares(@Req() req: Request) {
    return this.forward(req);
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Create share link (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  createShare(@Req() req: Request) {
    return this.forward(req);
  }

  @Delete(':id/share')
  @ApiOperation({ summary: 'Revoke all share links (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  revokeShare(@Req() req: Request) {
    return this.forward(req);
  }

  @Delete(':id/shares/:shareLinkId')
  @ApiOperation({ summary: 'Revoke one share link (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  @ApiParam({ name: 'shareLinkId', description: 'Share link UUID' })
  revokeShareById(@Req() req: Request) {
    return this.forward(req);
  }

  @Post(':id/reprocess')
  @ApiOperation({ summary: 'Reprocess media' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  reprocess(@Req() req: Request) {
    return this.forward(req);
  }

  @Post(':id/replace')
  @ApiOperation({ summary: 'Replace media file (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  replaceFile(@Req() req: Request) {
    return this.forward(req);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update media metadata (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  patchById(@Req() req: Request) {
    return this.forward(req);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get media by id (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  getById(@Req() req: Request) {
    return this.forward(req);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Force delete media' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  deleteById(@Req() req: Request) {
    return this.forward(req);
  }
}
