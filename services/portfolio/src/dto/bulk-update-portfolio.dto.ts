import { IsEnum, IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Bulk operations available for portfolio items.
 */
export enum BulkOperation {
  PUBLISH = 'PUBLISH',
  ARCHIVE = 'ARCHIVE',
  DELETE = 'DELETE',
  FEATURE = 'FEATURE',
  UNFEATURE = 'UNFEATURE',
}

/**
 * Data Transfer Object for performing bulk actions on portfolio items.
 */
export class BulkUpdatePortfolioDto {
  @ApiProperty({
    enum: BulkOperation,
    example: BulkOperation.PUBLISH,
    description: 'The operation to perform',
  })
  @IsEnum(BulkOperation)
  operation: BulkOperation;

  @ApiProperty({ example: ['123', '456'], description: 'List of portfolio item IDs' })
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
