import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser, AuthenticatedUser } from '@nestlancer/auth-lib';
import { ApiStandardResponse, ApiStandardResponses } from '@nestlancer/common';

import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  InitChunkUploadDto,
  UploadChunkDto,
  CompleteChunkUploadDto,
} from '../dto/chunk-upload.dto';
import { ChunkedUploadService } from './chunked-upload.service';

@ApiTags('Media - Chunked Upload')
@ApiBearerAuth()
@Controller('media/upload/chunked')
@UseGuards(JwtAuthGuard)
@ApiStandardResponses()
export class ChunkedUploadController {
  constructor(private readonly chunkedUpload: ChunkedUploadService) {}

  @Post('init')
  @ApiStandardResponse(Object)
  @ApiOperation({ summary: 'Initialize chunked upload' })
  async initChunkedUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InitChunkUploadDto,
  ): Promise<unknown> {
    return this.chunkedUpload.init(user.userId, dto);
  }

  @Post(':uploadId/part')
  @ApiStandardResponse(Object)
  @ApiOperation({ summary: 'Record uploaded chunk part' })
  async uploadChunk(
    @CurrentUser() user: AuthenticatedUser,
    @Param('uploadId') uploadId: string,
    @Body() dto: UploadChunkDto,
  ): Promise<unknown> {
    return this.chunkedUpload.recordPart(user.userId, uploadId, dto.partNumber, dto.etag);
  }

  @Post(':uploadId/complete')
  @ApiStandardResponse(Object)
  @ApiOperation({ summary: 'Complete chunked upload' })
  async completeChunkedUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('uploadId') uploadId: string,
    @Body() dto: CompleteChunkUploadDto,
  ): Promise<unknown> {
    return this.chunkedUpload.complete(user.userId, uploadId, dto.parts);
  }

  @Get(':uploadId/status')
  @ApiStandardResponse(Object)
  @ApiOperation({ summary: 'Get chunked upload status' })
  async getChunkUploadStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('uploadId') uploadId: string,
  ): Promise<unknown> {
    return this.chunkedUpload.getStatus(user.userId, uploadId);
  }

  @Post(':uploadId/abort')
  @ApiStandardResponse(Object)
  @ApiOperation({ summary: 'Abort chunked upload' })
  async abortChunkedUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('uploadId') uploadId: string,
  ): Promise<unknown> {
    return this.chunkedUpload.abort(user.userId, uploadId);
  }
}
