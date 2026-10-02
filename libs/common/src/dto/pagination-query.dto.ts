import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MIN_LIMIT,
} from '../constants/pagination.constants';

/** Standard pagination query DTO per 100-api-standards */
export class PaginationQueryDto {
  @ApiPropertyOptional({ default: DEFAULT_PAGE, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = DEFAULT_PAGE;

  @ApiPropertyOptional({ default: DEFAULT_LIMIT, minimum: MIN_LIMIT, maximum: MAX_LIMIT })
  @IsOptional()
  @Transform(({ value, obj }) => {
    const alias = obj?.pageSize;
    if (alias !== undefined && alias !== null && alias !== '') return Number(alias);
    if (value === undefined || value === null || value === '') return DEFAULT_LIMIT;
    return Number(value);
  })
  @Type(() => Number)
  @IsInt()
  @Min(MIN_LIMIT)
  @Max(MAX_LIMIT)
  limit: number = DEFAULT_LIMIT;

  /** Alias of `limit` so `?pageSize=` is not rejected by whitelist validation. */
  @ApiPropertyOptional({ minimum: MIN_LIMIT, maximum: MAX_LIMIT, description: 'Alias of limit' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MIN_LIMIT)
  @Max(MAX_LIMIT)
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Sort field:order (e.g., createdAt:desc)' })
  @IsOptional()
  @IsString()
  sort?: string;
}
