import { IsOptional, IsString, IsUUID, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '@nestlancer/common';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data Transfer Object for filtering and paginating portfolio items.
 */
export class QueryPortfolioDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Filter by category ID',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'React', description: 'Filter by a specific tag' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ example: true, description: 'Filter only featured items' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  featured?: boolean;
}
