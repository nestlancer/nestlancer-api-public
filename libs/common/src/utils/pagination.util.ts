import { PaginatedResult, PaginationOptions } from '../interfaces/pagination.interface';
import { PaginationMeta } from '../types/paginated-response.type';
import { clampPagination } from './clamp-pagination.util';

/** Creates a paginated result from total and options */
export function paginate<T>(
  data: T[],
  total: number,
  options: PaginationOptions,
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / options.limit);
  return {
    data,
    total,
    page: options.page,
    limit: options.limit,
    totalPages,
    hasNextPage: options.page < totalPages,
    hasPreviousPage: options.page > 1,
  };
}

/** Converts PaginatedResult to API response pagination meta */
export function toPaginationMeta(result: PaginatedResult<unknown>): PaginationMeta {
  return {
    page: result.page,
    limit: result.limit,
    totalItems: result.total,
    totalPages: result.totalPages,
    hasNextPage: result.hasNextPage,
    hasPreviousPage: result.hasPreviousPage,
  };
}

/** Calculates Prisma skip from page/limit */
export function calculateSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

export function buildPrismaSkipTake(pageStr?: string | number, limitStr?: string | number) {
  const { page, limit } = clampPagination(pageStr, limitStr);
  return { skip: (page - 1) * limit, take: limit };
}

export function createPaginationMeta(totalItems: number, page: number, limit: number) {
  return {
    page,
    limit,
    totalItems,
    totalPages: Math.ceil(totalItems / limit),
    hasNextPage: page * limit < totalItems,
    hasPreviousPage: page > 1,
  };
}
