import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { UpdateMediaMetadataDto } from './update-media-metadata.dto';

export enum AdminMediaVisibility {
  PRIVATE = 'PRIVATE',
  PUBLIC = 'PUBLIC',
}

export class AdminUpdateMediaDto extends UpdateMediaMetadataDto {
  @ApiPropertyOptional({ enum: AdminMediaVisibility })
  @IsOptional()
  @IsEnum(AdminMediaVisibility)
  visibility?: AdminMediaVisibility;

  @ApiPropertyOptional({ description: 'Override display filename shown in admin UI' })
  @IsOptional()
  @IsString()
  originalFilename?: string;

  @ApiPropertyOptional({ description: 'Arbitrary metadata patch merged into metadata JSON' })
  @IsOptional()
  @IsObject()
  metadataPatch?: Record<string, unknown>;
}
