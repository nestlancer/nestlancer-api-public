import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum PortfolioMediaRole {
  THUMBNAIL = 'thumbnail',
  GALLERY = 'gallery',
}

export class PromotePortfolioMediaDto {
  @ApiProperty({ description: 'Private deliverable media ID to copy' })
  @IsUUID()
  sourceMediaId: string;

  @ApiProperty({ description: 'Target portfolio item ID' })
  @IsUUID()
  portfolioItemId: string;

  @ApiProperty({ description: 'Source project ID (validates media attachment)' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ enum: PortfolioMediaRole, default: PortfolioMediaRole.GALLERY })
  @IsOptional()
  @IsEnum(PortfolioMediaRole)
  role?: PortfolioMediaRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  caption?: string;
}
