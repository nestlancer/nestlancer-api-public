import { paginate, calculateSkip } from '../../../src/utils/pagination.util';

describe('PaginationUtils', () => {
  describe('paginate', () => {
    const data = [1, 2, 3];
    const total = 10;

    it('should return correct pagination info for first page', () => {
      const options = { page: 1, limit: 3 };
      const result = paginate(data, total, options);

      expect(result.data).toEqual(data);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(3);
      expect(result.totalPages).toBe(4);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(false);
    });

    it('should return correct pagination info for last page', () => {
      const options = { page: 4, limit: 3 };
      const result = paginate(data, total, options);

      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(true);
    });
  });

  describe('calculateSkip', () => {
    it('should calculate skip correctly', () => {
      expect(calculateSkip(1, 10)).toBe(0);
      expect(calculateSkip(2, 10)).toBe(10);
      expect(calculateSkip(3, 20)).toBe(40);
    });
  });
});
