import { IsString, MaxLength, IsOptional, Matches, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data Transfer Object for creating a portfolio category.
 */
export class CreateCategoryDto {
  @ApiProperty({ example: 'Web Development', description: 'Display name of the category' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'web-development',
    description: 'URL-friendly slug (auto-generated if not provided)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug?: string;

  @ApiPropertyOptional({
    example: 'Projects related to web applications and sites',
    description: 'Detailed description of the category',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 1, description: 'Display order for sorting' })
  @IsOptional()
  @IsInt()
  order?: number;
}
