import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { FileType } from '../interfaces/media.interface';

/**
 * Data Transfer Object for performing a direct file upload.
 */
export class DirectUploadDto {
  @ApiPropertyOptional({
    enum: FileType,
    description:
      'Broad category of the file. Inferred from MIME type when omitted (defaults to DOCUMENT).',
  })
  @IsOptional()
  @IsEnum(FileType)
  fileType?: FileType;

  @ApiPropertyOptional({
    example: 'USER_FILE',
    description:
      'Legacy upload context hint from older clients. USER_FILE and similar values map to DOCUMENT when fileType is omitted.',
  })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Associated project ID',
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440002',
    description: 'Associated chat thread ID',
  })
  @IsOptional()
  @IsString()
  threadId?: string;

  @ApiPropertyOptional({
    example: '660f9511-f30c-52e5-b827-557766551111',
    description: 'Associated message ID',
  })
  @IsOptional()
  @IsString()
  messageId?: string;
}
