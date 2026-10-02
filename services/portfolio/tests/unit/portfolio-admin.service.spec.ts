import { PortfolioAdminService } from '../../src/services/portfolio-admin.service';

describe('PortfolioAdminService', () => {
  let service: PortfolioAdminService;
  let mockPrismaWrite: any;
  let mockPrismaRead: any;

  const mockItem = {
    id: 'pi-1',
    title: 'Website',
    slug: 'website',
    status: 'PUBLISHED',
    featured: true,
    categoryId: 'cat-1',
    createdAt: new Date(),
    category: { name: 'Web' },
  };

  beforeEach(() => {
    mockPrismaRead = {
      portfolioItem: {
        findMany: jest.fn().mockResolvedValue([mockItem]),
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockResolvedValue(mockItem),
      },
    };
    mockPrismaWrite = {
      portfolioItem: {
        update: jest.fn().mockResolvedValue({ ...mockItem, status: 'PUBLISHED' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        delete: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest
          .fn()
          .mockResolvedValue({ ...mockItem, id: 'pi-copy', title: 'Website (Copy)' }),
      },
    };
    service = new PortfolioAdminService(mockPrismaWrite, mockPrismaRead);
  });

  describe('findAll', () => {
    it('should return paginated items', async () => {
      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result.items).toHaveLength(1);
    });
  });

  describe('publish', () => {
    it('should set status to PUBLISHED and visibility PUBLIC', async () => {
      await service.publish('pi-1');
      expect(mockPrismaWrite.portfolioItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PUBLISHED', visibility: 'PUBLIC' }),
        }),
      );
    });

    it('should throw for non-existent item', async () => {
      mockPrismaRead.portfolioItem.findUnique.mockResolvedValue(null);
      await expect(service.publish('invalid')).rejects.toThrow();
    });
  });

  describe('toggleFeatured', () => {
    it('should toggle featured flag', async () => {
      await service.toggleFeatured('pi-1');
      expect(mockPrismaWrite.portfolioItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { featured: false } }),
      );
    });
  });

  describe('duplicate', () => {
    it('should create copy with updated title and slug', async () => {
      const result = await service.duplicate('pi-1');
      expect(result.title).toContain('Copy');
    });
  });

  describe('bulkUpdate', () => {
    it('should apply bulk publish', async () => {
      await service.bulkUpdate({ operation: 'PUBLISH', ids: ['pi-1'] } as any);
      expect(mockPrismaWrite.portfolioItem.updateMany).toHaveBeenCalled();
    });

    it('should apply bulk delete', async () => {
      await service.bulkUpdate({ operation: 'DELETE', ids: ['pi-1'] } as any);
      expect(mockPrismaWrite.portfolioItem.deleteMany).toHaveBeenCalled();
    });
  });
});
