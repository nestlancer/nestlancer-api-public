import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Upsert a service catalog package by unique slug.
 * Accepts either `basePricePaise` (seed JSON) or `basePrice` in major currency units.
 */
export class UpsertServicePackageDto {
  @ApiProperty({ example: 'Web Application MVP' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'web-application-mvp' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  slug: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'webDevelopment' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({
    description: 'Price in paise (preferred for seed payloads)',
    example: 5900000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  basePricePaise?: number;

  @ApiPropertyOptional({ description: 'Price in major currency units (e.g. INR)', example: 59000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedDays?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  revisionsIncluded?: number;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @IsOptional()
  @IsArray()
  deliverables?: unknown[];

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @IsOptional()
  @IsArray()
  addOns?: unknown[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Stable UUID when seeding known IDs' })
  @IsOptional()
  @IsString()
  id?: string;
}
