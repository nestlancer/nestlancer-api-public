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
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { MediaJobType } from '../interfaces/media-processing.interface';
import { RequestUploadDto } from '../dto/request-upload.dto';
import { ConfirmUploadDto } from '../dto/confirm-upload.dto';
import { DirectUploadDto } from '../dto/direct-upload.dto';
import { UpdateMediaMetadataDto } from '../dto/update-media-metadata.dto';
import { QueryMediaDto } from '../dto/query-media.dto';
import { ShareService } from '../share/share.service';
import { JwtAuthGuard, CurrentUser, AuthenticatedUser } from '@nestlancer/auth-lib';
import { ApiStandardResponse, ApiStandardResponses } from '@nestlancer/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';

/**
 * Controller for managing user-specific media files.
 * Provides endpoints for uploading, retrieving, updating, and deleting media assets.
 *
 * @category Media
 */
@ApiTags('Media')
@ApiBearerAuth()
@Controller('media')
@UseGuards(JwtAuthGuard)
@ApiStandardResponses()
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly shareService: ShareService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  /**
   * Retrieves a paginated list of media files belonging to the authenticated user.
   *
   * @param user The current authenticated user
   * @param query Filtering and pagination parameters
   * @returns Paginated list of media files
   */
  @Get()
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'List user media',
    description: 'Retrieve all media files uploaded by the current user with optional filtering.',
  })
  async getUserMedia(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryMediaDto,
  ): Promise<any> {
    return this.mediaService.findByUser(user.userId, query);
  }

  /**
   * Lists share links created by the authenticated user.
   * Must be declared before GET :id so "shared" is not treated as a media UUID.
   */
  @Get('shared')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'List shared media',
    description: 'Retrieve all media sharing links created by the current user.',
  })
  async listSharedMedia(@CurrentUser() user: AuthenticatedUser): Promise<any> {
    return this.shareService.listSharesByUploader(user.userId);
  }

  /**
   * Initiates a new media upload request.
   * Pre-validates file metadata and prepares the system for receiving file data.
   *
   * @param user The current authenticated user
   * @param dto Upload request details
   * @returns Upload session details including a unique reference
   */
  @Post('upload/request')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Request upload',
    description: 'Initiate an upload session by providing file metadata.',
  })
  async requestUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RequestUploadDto,
  ): Promise<any> {
    return this.mediaService.requestUpload(user.userId, dto);
  }

  /**
   * Confirms the completion of a media upload.
   * Triggers post-processing such as virus scanning and thumbnail generation.
   *
   * @param user The current authenticated user
   * @param dto Upload confirmation details
   * @returns Finalized media record
   */
  @Post('upload/confirm')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Confirm upload',
    description: 'Notify the system that the file upload to storage is complete.',
  })
  async confirmUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConfirmUploadDto,
  ): Promise<any> {
    return this.mediaService.confirmUpload(user.userId, dto);
  }

  /**
   * Performs a direct file upload from the client to the server.
   * Note: Prefer request/confirm flow for large files.
   *
   * @param user The current authenticated user
   * @param dto Upload metadata
   * @param file The uploaded file buffer
   * @returns Finalized media record
   */
  @Post('upload/direct')
  @UseInterceptors(FileInterceptor('file'))
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Direct upload',
    description:
      'Multipart upload: required field `file`; optional `fileType` (DOCUMENT|IMAGE|VIDEO|ARCHIVE) or legacy `context=USER_FILE`. Canonical path is POST /api/v1/media/upload/direct; /media/direct-upload is an alias.',
  })
  async directUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DirectUploadDto,
    @UploadedFile() file: any,
  ): Promise<any> {
    if (!file?.buffer?.length) {
      throw new BadRequestException(
        'Multipart field "file" is required. Send file plus optional fileType (DOCUMENT, IMAGE, …).',
      );
    }
    return this.mediaService.directUpload(user.userId, file, dto);
  }

  /**
   * Retrieves storage utilization statistics for the current user.
   *
   * @param user The current authenticated user
   * @returns Storage usage statistics
   */
  @Get('storage-usage')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Get storage stats',
    description: 'Retrieve current storage usage and limits for the authenticated user.',
  })
  async getStorageUsage(@CurrentUser() user: AuthenticatedUser): Promise<any> {
    return this.mediaService.getStorageStats(user.userId);
  }

  /** @deprecated Use GET /media/storage-usage — kept for backward compatibility; omitted from OpenAPI to avoid duplicate operationId. */
  @Get('storage/stats')
  @ApiExcludeEndpoint()
  async getStorageStatsLegacyPath(@CurrentUser() user: AuthenticatedUser): Promise<any> {
    return this.mediaService.getStorageStats(user.userId);
  }

  /** @deprecated Use GET /media/storage-usage */
  @Get('stats')
  @ApiExcludeEndpoint()
  async getStorageStatsLegacyStats(@CurrentUser() user: AuthenticatedUser): Promise<any> {
    return this.mediaService.getStorageStats(user.userId);
  }

  @Get(':id/status')
  @ApiStandardResponse(Object)
  @ApiOperation({ summary: 'Get media processing status' })
  async getProcessingStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<any> {
    return this.mediaService.getProcessingStatus(id, user.userId);
  }

  /**
   * Retrieves detailed information for a specific media file.
   *
   * @param user The current authenticated user
   * @param id The media file ID
   * @returns Full media metadata and status
   */
  @Get(':id')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Get media details',
    description: 'Fetch detailed metadata and processing status for a specific file.',
  })
  async getMediaDetails(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<any> {
    return this.mediaService.findById(id, user.userId);
  }

  /**
   * Updates the metadata (e.g., filename, description) of a media file.
   *
   * @param user The current authenticated user
   * @param id The media file ID
   * @param dto The new metadata values
   * @returns The updated media record
   */
  @Patch(':id')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Update metadata',
    description: 'Modify the descriptive metadata associated with a media file.',
  })
  async updateMetadata(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateMediaMetadataDto,
  ): Promise<any> {
    return this.mediaService.updateMetadata(id, user.userId, dto);
  }

  /** @deprecated Use PATCH /media/:id — same handler; omitted from OpenAPI to avoid duplicate operationId. */
  @Patch(':id/metadata')
  @ApiExcludeEndpoint()
  async updateMetadataLegacyPath(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateMediaMetadataDto,
  ): Promise<any> {
    return this.mediaService.updateMetadata(id, user.userId, dto);
  }

  /**
   * Deletes a media file and its physical storage.
   *
   * @param user The current authenticated user
   * @param id The media file ID
   * @returns Confirmation of deletion
   */
  @Delete(':id')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Delete media',
    description: 'Permanently remove a media file and its associated storage assets.',
  })
  async deleteMedia(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<any> {
    return this.mediaService.delete(id, user.userId);
  }

  /**
   * Generates a temporary secure download URL for a media file.
   *
   * @param user The current authenticated user
   * @param id The media file ID
   * @returns A signed temporary download URL
   */
  @Get(':id/download')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Get download URL',
    description: 'Generate a secure, time-limited URL for downloading the file.',
  })
  async getDownloadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<any> {
    return this.mediaService.getDownloadUrl(id, user.userId);
  }

  /**
   * Creates a copy of an existing media file in a different folder.
   *
   * @param user The current authenticated user
   * @param id The media file ID
   * @param body Destination folder details
   * @returns Details of the newly created copy
   */
  @Post(':id/copy')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Copy media',
    description: 'Create a duplicate of an existing media file.',
  })
  async copyMedia(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { destinationFolderId?: string },
  ): Promise<any> {
    return this.mediaService.copyMedia(user.userId, id, body.destinationFolderId);
  }

  /**
   * Moves a media file to a different storage folder.
   *
   * @param user The current authenticated user
   * @param id The media file ID
   * @param body Destination folder details
   * @returns Confirmation of movement
   */
  @Post(':id/move')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Move media',
    description: 'Relocate a media file to a new virtual directory.',
  })
  async moveMedia(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { destinationFolderId: string },
  ): Promise<any> {
    return this.mediaService.moveMedia(user.userId, id, body.destinationFolderId);
  }

  /**
   * Forces the regeneration of media thumbnails.
   *
   * @param user The current authenticated user
   * @param id The media file ID
   * @returns Confirmation of regeneration request
   */
  @Post(':id/regenerate-thumbnail')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Regenerate thumbnail',
    description: 'Trigger the re-creation of preview images for this file.',
  })
  async regenerateThumbnail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<any> {
    await this.mediaService.findById(id, user.userId);
    await this.mediaService.enqueueReprocess(id, MediaJobType.THUMBNAIL_REGENERATE);
    return { id, thumbnailGenerated: true, queued: true };
  }

  /**
   * Retrieves a history of file versions for this media asset.
   *
   * @param user The current authenticated user
   * @param id The media file ID
   * @returns List of file versions
   */
  @Get(':id/versions')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'List versions',
    description: 'Fetch all historical versions and revisions of this media file.',
  })
  async getVersions(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<any> {
    return { id, versions: [] };
  }
}
