import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { FileType } from '../interfaces/media.interface';

/**
 * Data Transfer Object for initializing a multipart/chunked upload.
 */
export class InitChunkUploadDto {
  @ApiProperty({ example: 'large-video.mp4', description: 'Original filename' })
  @IsString()
  filename: string;

  @ApiProperty({ example: 'video/mp4', description: 'MIME type' })
  @IsString()
  mimeType: string;

  @ApiProperty({ example: 524288000, description: 'Total file size in bytes' })
  @IsNumber()
  totalSize: number;

  @ApiPropertyOptional({ enum: FileType })
  @IsOptional()
  @IsEnum(FileType)
  fileType?: FileType;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440002' })
  @IsOptional()
  @IsString()
  threadId?: string;

  @ApiPropertyOptional({ example: 10485760, description: 'Chunk size in bytes' })
  @IsOptional()
  @IsNumber()
  chunkSize?: number;
}

/**
 * Data Transfer Object for uploading an individual file chunk.
 */
export class UploadChunkDto {
  @ApiProperty({ description: 'The unique ID assigned during initialization' })
  @IsString()
  uploadId: string;

  @ApiProperty({ example: 1, description: 'The sequential part number (1-indexed)' })
  @IsNumber()
  partNumber: number;

  @ApiProperty({ description: 'ETag returned by storage after uploading the part' })
  @IsString()
  etag: string;
}

/**
 * Data Transfer Object for finalising a chunked upload.
 */
class MultipartPartDto {
  @ApiProperty()
  @IsNumber()
  partNumber: number;

  @ApiProperty()
  @IsString()
  etag: string;
}

export class CompleteChunkUploadDto {
  @ApiPropertyOptional({ description: 'Media / session id from init' })
  @IsOptional()
  @IsString()
  uploadId?: string;

  @ApiPropertyOptional({ type: [MultipartPartDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MultipartPartDto)
  parts?: MultipartPartDto[];
}
