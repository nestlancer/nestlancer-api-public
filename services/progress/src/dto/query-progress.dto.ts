import { IsOptional, IsEnum, IsUUID, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ProgressEntryType } from '../interfaces/progress.interface';

/**
 * Data Transfer Object for querying progress entries with filters and pagination.
 */
export class QueryProgressDto {
  @ApiPropertyOptional({
    enum: ProgressEntryType,
    example: ProgressEntryType.UPDATE,
    description: 'Filter by type of progress entry',
  })
  @IsOptional()
  @IsEnum(ProgressEntryType)
  type?: ProgressEntryType;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Filter by project ID',
  })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Page number for pagination' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, description: 'Number of items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    example: 20,
    description: 'Alias of limit. Accepted so clients using pageSize are not rejected.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
