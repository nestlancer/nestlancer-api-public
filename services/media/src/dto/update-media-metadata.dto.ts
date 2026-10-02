import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

/**
 * Data Transfer Object for updating media file metadata.
 */
export class UpdateMediaMetadataDto {
  @ApiPropertyOptional({ example: 'new-filename.png', description: 'Updated filename' })
  @IsOptional()
  @IsString()
  filename?: string;

  @ApiPropertyOptional({ example: 'A photo from the event', description: 'Brief description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: { key: 'value' }, description: 'Additional custom metadata' })
  @IsOptional()
  @IsObject()
  customMetadata?: Record<string, string>;
}
