import { IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PortfolioMediaKind } from '@prisma/client';

export class AddMediaDto {
  @ApiPropertyOptional({ description: 'Media asset ID' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional({ description: 'Alternative media asset ID field' })
  @IsOptional()
  @IsUUID()
  mediaId?: string;

  @ApiPropertyOptional({ description: 'Alt text for the image' })
  @IsOptional()
  @IsString()
  alt?: string;

  @ApiPropertyOptional({ description: 'Caption for the image' })
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ enum: PortfolioMediaKind, description: 'Preview asset type' })
  @IsOptional()
  @IsEnum(PortfolioMediaKind)
  kind?: PortfolioMediaKind;

  @ApiPropertyOptional({ description: 'Display title (documents/videos)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}

export class ReorderMediaItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  mediaId?: string;

  @IsInt()
  @Min(0)
  order: number;
}
