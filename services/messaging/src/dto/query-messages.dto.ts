import { IsOptional, IsUUID, IsInt, Min, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Data Transfer Object for querying and filtering messages.
 */
export class QueryMessagesDto {
  @ApiPropertyOptional({ description: 'Filter messages by project ID' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter messages by parent message thread ID' })
  @IsOptional()
  @IsUUID()
  replyToId?: string; // To fetch threads

  @ApiPropertyOptional({ description: 'Search term for message content' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1, description: 'Pagination page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 50, description: 'Number of items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;
}
