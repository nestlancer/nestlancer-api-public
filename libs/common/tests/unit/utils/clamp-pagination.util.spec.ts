import { clampPagination } from '../../../src/utils/clamp-pagination.util';

describe('clampPagination', () => {
  it('clamps limit to max 100', () => {
    expect(clampPagination(1, 100000)).toEqual({ page: 1, limit: 100 });
  });

  it('clamps invalid values to defaults', () => {
    expect(clampPagination(undefined, undefined)).toEqual({ page: 1, limit: 20 });
  });

  it('enforces minimum page and limit', () => {
    expect(clampPagination(0, 0)).toEqual({ page: 1, limit: 20 });
    expect(clampPagination(1, -5)).toEqual({ page: 1, limit: 1 });
  });
});
