import { PipeTransform, Injectable } from '@nestjs/common';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MIN_LIMIT,
} from '../constants/pagination.constants';

/**
 * Ensures pagination values are within allowed bounds.
 */
@Injectable()
export class ParsePaginationPipe implements PipeTransform<PaginationQueryDto, PaginationQueryDto> {
  transform(value: PaginationQueryDto): PaginationQueryDto {
    value.page = Math.max(1, value.page || DEFAULT_PAGE);
    value.limit = Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, value.limit || DEFAULT_LIMIT));
    return value;
  }
}
