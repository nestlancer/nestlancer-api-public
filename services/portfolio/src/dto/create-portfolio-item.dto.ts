import {
  IsString,
  MaxLength,
  IsOptional,
  Matches,
  IsEnum,
  IsUUID,
  IsArray,
  IsBoolean,
  IsInt,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Format options for the portfolio item content.
 */
export enum ContentFormat {
  MARKDOWN = 'MARKDOWN',
  HTML = 'HTML',
}

/**
 * Admin-curated client review shown on the public portfolio showcase.
 */
export class ClientTestimonialDto {
  @ApiPropertyOptional({ example: 'They delivered on time and exceeded expectations.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  quote?: string;

  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  author?: string;

  @ApiPropertyOptional({ example: 'CEO, Acme Corp' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  role?: string;

  @ApiPropertyOptional({ example: 5, description: 'Star rating from 1 to 5' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'When false, review is stored but hidden on the public showcase',
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

/**
 * Details about the client for the portfolio project.
 */
export class ClientDto {
  @ApiProperty({ example: 'Acme Corp', description: 'Name of the client' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174001',
    description: 'Media ID for the client logo',
  })
  @IsOptional()
  @IsUUID()
  logoId?: string;

  @ApiPropertyOptional({ example: 'E-commerce', description: 'Client industry' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional({ example: 'https://acme.com', description: 'Client website' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @ApiPropertyOptional({ type: () => ClientTestimonialDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ClientTestimonialDto)
  testimonial?: ClientTestimonialDto;
}

/**
 * Technical details regarding the project implementation.
 */
export class ProjectDetailsDto {
  @ApiPropertyOptional({ example: '3 months', description: 'Duration of the project' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  duration?: string;

  @ApiPropertyOptional({
    example: '2023-12-01',
    description: 'Completion date (human-readable or ISO)',
  })
  @IsOptional()
  @IsString()
  completedAt?: string;

  @ApiPropertyOptional({
    example: ['React', 'Node.js'],
    description: 'Technologies used in the project',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  technologies?: string[];
}

/**
 * External links associated with the portfolio item.
 */
export class LinksDto {
  @ApiPropertyOptional({ example: 'https://acme.com', description: 'Live project URL' })
  @IsOptional()
  @IsString()
  live?: string;

  @ApiPropertyOptional({
    example: 'https://github.com/acme/project',
    description: 'Source code repository URL',
  })
  @IsOptional()
  @IsString()
  github?: string;
}

/**
 * SEO metadata for the portfolio item page.
 */
export class SeoDto {
  @ApiPropertyOptional({ example: 'Portfolio | Acme Project', description: 'Meta title tag' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  metaTitle?: string;

  @ApiPropertyOptional({
    example: 'Detailed view of the Acme project...',
    description: 'Meta description tag',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  metaDescription?: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174002',
    description: 'Media ID for Open Graph image',
  })
  @IsOptional()
  @IsUUID()
  ogImageId?: string;
}

/**
 * Data Transfer Object for creating a new portfolio item.
 */
export class CreatePortfolioItemDto {
  @ApiProperty({
    example: 'Modern E-commerce Platform',
    description: 'The title of the portfolio item',
  })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({
    example: 'modern-ecommerce-platform',
    description: 'URL-friendly slug (auto-generated if not provided)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug?: string;

  @ApiProperty({
    example: 'A brief overview of the project',
    description: 'A short summary for list views',
  })
  @IsString()
  @MaxLength(500)
  shortDescription: string;

  @ApiProperty({
    example: 'Detailed description with markdown...',
    description: 'Full project details',
  })
  @IsString()
  @MaxLength(50000)
  fullDescription: string;

  @ApiProperty({
    enum: ContentFormat,
    example: ContentFormat.MARKDOWN,
    description: 'The format of the full description',
  })
  @IsEnum(ContentFormat)
  contentFormat: ContentFormat;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174003',
    description: 'Category ID',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: ['React', 'NestJS'], description: 'List of tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174004',
    description: 'Main thumbnail image ID',
  })
  @IsOptional()
  @IsUUID()
  thumbnailId?: string;

  @ApiPropertyOptional({ example: ['123', '456'], description: 'Additional gallery image IDs' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  imageIds?: string[];

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174005',
    description: 'Video media ID',
  })
  @IsOptional()
  @IsString()
  videoId?: string;

  @ApiPropertyOptional({ type: () => ClientDto, description: 'Client details' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ClientDto)
  client?: ClientDto;

  @ApiPropertyOptional({ type: () => ProjectDetailsDto, description: 'Technical project details' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectDetailsDto)
  projectDetails?: ProjectDetailsDto;

  @ApiPropertyOptional({ type: () => LinksDto, description: 'External links' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LinksDto)
  links?: LinksDto;

  @ApiPropertyOptional({ type: () => SeoDto, description: 'SEO metadata' })
  @IsOptional()
  @ValidateNested()
  @Type(() => SeoDto)
  seo?: SeoDto;

  @ApiPropertyOptional({ example: true, description: 'Highlight on homepage listings' })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({
    example: 'Confidential Client',
    description: 'Flat client name (admin editor)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  clientName?: string;

  @ApiPropertyOptional({
    example: 'E-commerce',
    description: 'Flat client industry (admin editor)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  clientIndustry?: string;

  @ApiPropertyOptional({
    example: 'https://acme.com',
    description: 'Flat client website (admin editor)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  clientWebsite?: string;

  @ApiPropertyOptional({ type: () => ClientTestimonialDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ClientTestimonialDto)
  clientTestimonial?: ClientTestimonialDto;
}
