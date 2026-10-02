import { IsArray, ValidateNested, IsUUID, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Individual item reordering information.
 */
export class ReorderItemDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Item ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: 1, description: 'The new order rank' })
  @IsInt()
  order: number;
}

/**
 * Data Transfer Object for reordering multiple portfolio items.
 */
export class ReorderPortfolioDto {
  @ApiProperty({ type: [ReorderItemDto], description: 'List of items and their new order' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items: ReorderItemDto[];
}
