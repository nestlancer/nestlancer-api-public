import { Controller, Get, Post, Patch, Delete, Param, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiConsumes } from '@nestjs/swagger';

import { Request } from 'express';

import { Public, ApiStandardResponses } from '@nestlancer/common';

import { HttpProxyService } from '../../proxy';

/**
 * Media Gateway Controller — paths aligned with the media microservice (@Controller('media')).
 * Legacy aliases (request, confirm, storage-stats, download-url) rewrite to canonical paths.
 */
@Controller('media')
@ApiTags('media')
@ApiBearerAuth()
@ApiStandardResponses()
export class MediaController {
  constructor(private readonly proxy: HttpProxyService) {}

  private mediaPath(suffix: string): string {
    return `/api/v1/media/${suffix}`;
  }

  private forwardTo(req: Request, suffix: string) {
    return this.proxy.forward('media', req, undefined, this.mediaPath(suffix));
  }

  @Get()
  @ApiOperation({ summary: 'List user media files' })
  async listMedia(@Req() req: Request) {
    return this.proxy.forward('media', req);
  }

  @Get('shared')
  @ApiOperation({ summary: 'List media share links for the current user' })
  async listSharedMedia(@Req() req: Request) {
    return this.proxy.forward('media', req);
  }

  @Post('upload/request')
  @ApiOperation({
    summary: 'Request a presigned upload URL',
    description:
      'Canonical client upload entrypoint. After upload to S3, confirm via POST /api/v1/media/upload/confirm.',
  })
  async requestUpload(@Req() req: Request) {
    return this.proxy.forward('media', req);
  }

  /** @deprecated Use POST upload/request */
  @Post('request')
  @ApiOperation({ summary: 'Request upload (legacy alias)' })
  async requestUploadLegacy(@Req() req: Request) {
    return this.forwardTo(req, 'upload/request');
  }

  /** @deprecated Use POST upload/request */
  @Post('presigned-upload')
  @ApiOperation({ summary: 'Presigned upload (legacy alias)' })
  async presignedUploadLegacy(@Req() req: Request) {
    return this.forwardTo(req, 'upload/request');
  }

  @Post('upload/confirm')
  @ApiOperation({ summary: 'Confirm a completed upload' })
  async confirmUpload(@Req() req: Request) {
    return this.proxy.forward('media', req);
  }

  /** @deprecated Use POST upload/confirm */
  @Post('confirm')
  @ApiOperation({ summary: 'Confirm upload (legacy alias)' })
  async confirmUploadLegacy(@Req() req: Request) {
    return this.forwardTo(req, 'upload/confirm');
  }

  @Post('upload/direct')
  @ApiOperation({ summary: 'Direct file upload' })
  @ApiConsumes('multipart/form-data')
  async directUpload(@Req() req: Request) {
    return this.proxy.forward('media', req);
  }

  /** @deprecated Use POST upload/direct */
  @Post('direct-upload')
  @ApiOperation({
    summary: 'Direct upload (legacy alias)',
    description:
      'Same as POST /api/v1/media/upload/direct. Multipart: field `file` required; optional `fileType` or legacy `context=USER_FILE`.',
  })
  async directUploadLegacy(@Req() req: Request) {
    return this.forwardTo(req, 'upload/direct');
  }

  @Get('storage-usage')
  @ApiOperation({ summary: 'Get storage usage statistics' })
  async getStorageUsage(@Req() req: Request) {
    return this.proxy.forward('media', req);
  }

  /** @deprecated Use GET storage-usage */
  @Get('storage-stats')
  @ApiOperation({ summary: 'Storage stats (legacy alias)' })
  async getStorageStatsLegacy(@Req() req: Request) {
    return this.forwardTo(req, 'storage-usage');
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Media service health check' })
  async health(@Req() req: Request) {
    return this.proxy.forward('media', req, undefined, '/api/v1/health');
  }

  @Post('upload/chunked/init')
  @ApiOperation({ summary: 'Initialize chunked upload' })
  async initChunkedUpload(@Req() req: Request) {
    return this.proxy.forward('media', req);
  }

  @Post('upload/chunked/:uploadId/part')
  @ApiOperation({ summary: 'Upload a chunk (multipart part)' })
  @ApiParam({ name: 'uploadId', description: 'Chunked upload session ID' })
  async uploadChunkPart(@Req() req: Request) {
    return this.proxy.forward('media', req);
  }

  /** @deprecated Use POST upload/chunked/:uploadId/part */
  @Post('upload/chunked/:uploadId/chunk')
  @ApiOperation({ summary: 'Upload a chunk (legacy alias)' })
  @ApiParam({ name: 'uploadId', description: 'Chunked upload session ID' })
  async uploadChunkLegacy(@Req() req: Request) {
    const uploadId = req.params.uploadId;
    return this.forwardTo(req, `upload/chunked/${uploadId}/part`);
  }

  @Post('upload/chunked/:uploadId/complete')
  @ApiOperation({ summary: 'Complete chunked upload' })
  @ApiParam({ name: 'uploadId', description: 'Chunked upload session ID' })
  async completeChunkedUpload(@Req() req: Request) {
    return this.proxy.forward('media', req);
  }

  @Get('upload/chunked/:uploadId/status')
  @ApiOperation({ summary: 'Chunked upload progress' })
  @ApiParam({ name: 'uploadId', description: 'Chunked upload session ID' })
  async getChunkedUploadStatus(@Req() req: Request) {
    return this.proxy.forward('media', req);
  }

  @Post('upload/chunked/:uploadId/abort')
  @ApiOperation({ summary: 'Abort chunked upload' })
  @ApiParam({ name: 'uploadId', description: 'Chunked upload session ID' })
  async abortChunkedUpload(@Req() req: Request) {
    return this.proxy.forward('media', req);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get media processing status' })
  @ApiParam({ name: 'id', description: 'Media UUID' })
  async getMediaProcessingStatus(@Req() req: Request) {
    return this.proxy.forward('media', req);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get media details' })
  @ApiParam({ name: 'id', description: 'Media UUID' })
  async getMediaDetails(@Req() req: Request) {
    return this.proxy.forward('media', req);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update media metadata' })
  @ApiParam({ name: 'id', description: 'Media UUID' })
  async updateMetadata(@Req() req: Request) {
    return this.proxy.forward('media', req);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete media' })
  @ApiParam({ name: 'id', description: 'Media UUID' })
  async deleteMedia(@Req() req: Request) {
    return this.proxy.forward('media', req);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get download URL for media' })
  @ApiParam({ name: 'id', description: 'Media UUID' })
  async getDownloadUrl(@Req() req: Request) {
    return this.proxy.forward('media', req);
  }

  /** @deprecated Use GET :id/download */
  @Get(':id/download-url')
  @ApiOperation({ summary: 'Download URL (legacy alias)' })
  @ApiParam({ name: 'id', description: 'Media UUID' })
  async getDownloadUrlLegacy(@Req() req: Request) {
    const id = req.params.id;
    return this.forwardTo(req, `${id}/download`);
  }

  @Post(':id/copy')
  @ApiOperation({ summary: 'Copy media to another folder' })
  @ApiParam({ name: 'id', description: 'Media UUID' })
  async copyMedia(@Req() req: Request) {
    return this.proxy.forward('media', req);
  }

  @Post(':id/move')
  @ApiOperation({ summary: 'Move media to another folder' })
  @ApiParam({ name: 'id', description: 'Media UUID' })
  async moveMedia(@Req() req: Request) {
    return this.proxy.forward('media', req);
  }

  @Post(':id/regenerate-thumbnail')
  @ApiOperation({ summary: 'Regenerate media thumbnail' })
  @ApiParam({ name: 'id', description: 'Media UUID' })
  async regenerateThumbnail(@Req() req: Request) {
    return this.proxy.forward('media', req);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get media version history' })
  @ApiParam({ name: 'id', description: 'Media UUID' })
  async getVersions(@Req() req: Request) {
    return this.proxy.forward('media', req);
  }

  @Get(':id/shares')
  @ApiOperation({ summary: 'List share links for media' })
  @ApiParam({ name: 'id', description: 'Media UUID' })
  async listShareLinks(@Req() req: Request) {
    return this.proxy.forward('media', req);
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Create share link for media' })
  @ApiParam({ name: 'id', description: 'Media UUID' })
  async createShareLink(@Req() req: Request) {
    return this.proxy.forward('media', req);
  }

  @Delete(':id/share')
  @ApiOperation({ summary: 'Revoke all share links for media' })
  @ApiParam({ name: 'id', description: 'Media UUID' })
  async revokeShareLink(@Req() req: Request) {
    return this.proxy.forward('media', req);
  }

  @Delete(':id/shares/:shareLinkId')
  @ApiOperation({ summary: 'Revoke one share link for media' })
  @ApiParam({ name: 'id', description: 'Media UUID' })
  @ApiParam({ name: 'shareLinkId', description: 'Share link UUID' })
  async revokeShareLinkById(@Req() req: Request) {
    return this.proxy.forward('media', req);
  }
}
