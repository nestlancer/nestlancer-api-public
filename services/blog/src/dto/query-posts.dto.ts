import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '@nestlancer/common';

/**
 * Data Transfer Object for querying published blog posts with advanced filtering criteria.
 */
export class QueryPostsDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filter result set by a specific primary category identifier',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    example: 'typescript',
    description: 'Filter result set by a specific taxonomy tag name',
  })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filter result set by a specific author user account',
  })
  @IsOptional()
  @IsUUID()
  authorId?: string;

  @ApiPropertyOptional({
    example: 'nest-js',
    description: 'Search keyword to match against post titles, excerpts, or content bodies',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
