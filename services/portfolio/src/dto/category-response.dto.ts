import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data Transfer Object for category response.
 */
export class CategoryResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique category ID',
  })
  id: string;

  @ApiProperty({ example: 'Web Development', description: 'Display name' })
  name: string;

  @ApiProperty({ example: 'web-development', description: 'URL-friendly slug' })
  slug: string;

  @ApiPropertyOptional({ example: 'Web projects', description: 'Description' })
  description?: string;

  @ApiProperty({ example: 10, description: 'Number of portfolio items in this category' })
  itemCount: number;

  @ApiProperty({ example: 1, description: 'Display order' })
  order: number;
}
