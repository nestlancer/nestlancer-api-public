import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
  MIN_LIMIT,
} from '../constants/pagination.constants';

/** Clamp raw page/limit query values to API-standard bounds (§100-api-standards). */
export function clampPagination(
  page?: string | number | null,
  limit?: string | number | null,
): { page: number; limit: number } {
  const parsedPage = Math.max(1, Number(page) || DEFAULT_PAGE);
  const parsedLimit = Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, Number(limit) || DEFAULT_LIMIT));
  return { page: parsedPage, limit: parsedLimit };
}
