import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Max, Min, IsEnum } from 'class-validator';
import { MAX_FILE_SIZES, FileType } from '../interfaces/media.interface';

/**
 * Data Transfer Object for requesting a new media upload.
 * Used to pre-validate file requirements and generate upload URLs/IDs.
 */
export class RequestUploadDto {
  @ApiProperty({ example: 'vacation-photo.jpg', description: 'Original filename with extension' })
  @IsString()
  filename: string;

  @ApiProperty({ example: 'image/jpeg', description: 'Standard MIME type of the file' })
  @IsString()
  mimeType: string;

  @ApiProperty({ example: 1048576, description: 'File size in bytes' })
  @IsNumber()
  @Min(1)
  @Max(MAX_FILE_SIZES.video) // absolute max across all types
  size: number;

  @ApiProperty({ enum: FileType, description: 'Broad category of the file' })
  @IsEnum(FileType)
  fileType: FileType;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Associated project ID if applicable',
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440002',
    description: 'Associated chat thread ID if applicable',
  })
  @IsOptional()
  @IsString()
  threadId?: string;

  @ApiPropertyOptional({
    example: '660f9511-f30c-52e5-b827-557766551111',
    description: 'Associated message ID if applicable',
  })
  @IsOptional()
  @IsString()
  messageId?: string;
}
