import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { DirectUploadDto } from '../dto/direct-upload.dto';
import { JwtAuthGuard, CurrentUser, AuthenticatedUser } from '@nestlancer/auth-lib';
import { ApiStandardResponse, ApiStandardResponses, Public } from '@nestlancer/common';

import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

/**
 * Root controller for the Media service.
 * Handles base routes that may be exposed directly or via gateway mapping.
 *
 * @category Media
 */
@ApiTags('Media - Root')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
@ApiStandardResponses()
export class MediaRootController {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * Basic health check for the Media microservice.
   *
   * @returns Service status and identification
   */
  @Public()
  @Get('health')
  @ApiOperation({
    summary: 'Service health',
    description: 'Simple health check for the media service instance.',
  })
  async health(): Promise<any> {
    return { status: 'ok', service: 'media' };
  }

  /**
   * Performs a direct file upload from the client.
   *
   * @param user The current authenticated user
   * @param dto Upload metadata
   * @param file The uploaded file buffer
   * @returns Finalized media record
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Root upload',
    description: 'Exposes direct upload at the root path for specific gateway configurations.',
  })
  async upload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DirectUploadDto,
    @UploadedFile() file: any,
  ): Promise<any> {
    return this.mediaService.directUpload(user.userId, file, dto);
  }

  /**
   * Retrieves storage utilization statistics at the root level.
   *
   * @param user The current authenticated user
   * @returns Storage usage summary
   */
  @Get('stats')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Get root stats',
    description: 'Retrieve storage statistics for the user at the root level.',
  })
  async getStats(@CurrentUser() user: AuthenticatedUser): Promise<any> {
    return this.mediaService.getStorageStats(user.userId);
  }

  /**
   * Retrieves the current processing status of a media asset.
   *
   * @param user The current authenticated user
   * @param id The media file ID
   * @returns Current processing state (e.g., UPLOADING, PROCESSING, READY)
   */
  @Get(':id/status')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Get processing status',
    description: 'Fetch the real-time processing state of a media asset.',
  })
  async getProcessingStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<any> {
    return this.mediaService.getProcessingStatus(id, user.userId);
  }
}
