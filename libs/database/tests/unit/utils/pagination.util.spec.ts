import { buildPrismaSkipTake } from '../../../src/utils/pagination.util';

describe('Pagination Utility', () => {
  describe('buildPrismaSkipTake', () => {
    it('should return default skip and take if no pagination is provided', () => {
      const result = buildPrismaSkipTake(undefined);
      expect(result).toEqual({ skip: 0, take: 10 });
    });

    it('should return skip and take based on provided page and limit', () => {
      const pagination = { page: 3, limit: 15 };
      const result = buildPrismaSkipTake(pagination);
      expect(result).toEqual({ skip: 30, take: 15 });
    });

    it('should handle string values if they can be coerced implicitly (though types should prevent this)', () => {
      // Technically the function relies on JS mathematical operator coercion if numbers are passed as strings
      const pagination = { page: '2', limit: '20' } as any;
      const result = buildPrismaSkipTake(pagination);
      expect(result).toEqual({ skip: 20, take: 20 });
    });

    it('should use default page if limit is provided but page is missing', () => {
      const pagination = { limit: 25 };
      const result = buildPrismaSkipTake(pagination);
      expect(result).toEqual({ skip: 0, take: 25 });
    });

    it('should use default limit if page is provided but limit is missing', () => {
      const pagination = { page: 4 };
      const result = buildPrismaSkipTake(pagination);
      expect(result).toEqual({ skip: 30, take: 10 });
    });
  });
});
