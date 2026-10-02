import { ResponseMetadata } from './api-response.type';

/** Paginated API response envelope per 100-api-standards */
export interface PaginatedResponse<T = unknown> {
  status: 'success';
  data: T[];
  pagination: PaginationMeta;
  metadata: ResponseMetadata;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
