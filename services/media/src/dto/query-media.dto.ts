import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { FileType, MediaStatus } from '../interfaces/media.interface';
import { PaginationQueryDto } from '@nestlancer/common';

export enum MediaVisibilityFilter {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

/**
 * Data Transfer Object for querying and filtering user media.
 */
export class QueryMediaDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: FileType, description: 'Filter by file category' })
  @IsOptional()
  @IsEnum(FileType)
  fileType?: FileType;

  @ApiPropertyOptional({ enum: MediaStatus, description: 'Filter by processing status' })
  @IsOptional()
  @IsEnum(MediaStatus)
  status?: MediaStatus;

  @ApiPropertyOptional({ description: 'Search filename, mime type, or UUID' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by uploader user ID' })
  @IsOptional()
  @IsUUID()
  uploaderId?: string;

  @ApiPropertyOptional({ enum: MediaVisibilityFilter, description: 'Public or private bucket' })
  @IsOptional()
  @IsEnum(MediaVisibilityFilter)
  visibility?: MediaVisibilityFilter;

  @ApiPropertyOptional({
    description:
      'Filter by context type (project, thread, message, folder). Use "ungrouped" for orphans.',
  })
  @IsOptional()
  @IsString()
  contextType?: string;

  @ApiPropertyOptional({
    description: 'Filter by context id (e.g. project UUID when contextType=project)',
  })
  @IsOptional()
  @IsString()
  contextId?: string;

  @ApiPropertyOptional({
    description:
      'Client list scope: library (default) = owned + accessible project/message/delivery files; owned = uploader only.',
    enum: ['library', 'owned'],
    default: 'library',
  })
  @IsOptional()
  @IsString()
  scope?: 'library' | 'owned';

  @ApiPropertyOptional({
    description:
      'Admin: list media related to this user (their uploads + project/message/delivery files), not only uploaderId.',
  })
  @IsOptional()
  @IsUUID()
  relatedToUserId?: string;

  @ApiPropertyOptional({
    description:
      'When false (default), list responses skip presigned S3 URLs to reduce storage API usage.',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeUrls?: boolean;
}
