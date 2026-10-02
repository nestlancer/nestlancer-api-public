import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, IsOptional, IsUUID } from 'class-validator';

/**
 * Data Transfer Object for defining a new organizational blog category.
 */
export class CreateCategoryDto {
  @ApiProperty({
    example: 'Technology',
    description: 'The user-facing display name of the blog category',
  })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'technology',
    description:
      'The unique URL-friendly slug for the category. Auto-generated from name if omitted.',
  })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({
    example: 'Posts about the latest in industry technology trends...',
    description: 'A brief description of the classification or purpose of this category',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

import { PartialType } from '@nestjs/mapped-types';

/**
 * Data Transfer Object for modifying the details of an existing blog category.
 */
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

/**
 * Data Transfer Object for creating a new granular metadata tag for posts.
 */
export class CreateTagDto {
  @ApiProperty({
    example: 'typescript',
    description: 'The unique, case-insensitive identifier name for the taxonomy tag',
  })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({
    example: 'typescript',
    description: 'URL slug. Auto-generated from name if omitted.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  slug?: string;
}

/**
 * Data Transfer Object for renaming or modifying a blog tag.
 */
export class UpdateTagDto {
  @ApiProperty({
    example: 'node-js',
    description: 'The updated display name for the specified tag',
  })
  @IsString()
  @MaxLength(50)
  name: string;
}

/**
 * Data Transfer Object for initiating a consolidate-and-redirect operation between two tags.
 */
export class MergeTagsDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description:
      'The unique identifier of the source tag that will be merged and potentially removed',
  })
  @IsUUID()
  fromTagId: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description:
      'The unique identifier of the target tag that will receive all associated post references',
  })
  @IsUUID()
  toTagId: string;
}
