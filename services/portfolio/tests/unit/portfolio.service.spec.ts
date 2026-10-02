import { PortfolioService } from '../../src/services/portfolio.service';

describe('PortfolioService', () => {
  let service: PortfolioService;
  let mockPrismaWrite: any;
  let mockPrismaRead: any;

  const mockItem = {
    id: 'pi-1',
    title: 'Website',
    slug: 'website',
    status: 'PUBLISHED',
    featured: true,
    viewCount: 100,
    likeCount: 50,
    createdAt: new Date(),
    category: { name: 'Web' },
    tags: [],
  };

  beforeEach(() => {
    mockPrismaRead = {
      portfolioItem: {
        findMany: jest.fn().mockResolvedValue([mockItem]),
        count: jest.fn().mockResolvedValue(1),
        findFirst: jest.fn().mockResolvedValue(mockItem),
      },
    };
    mockPrismaWrite = {
      portfolioItem: {
        create: jest.fn().mockResolvedValue({ ...mockItem, id: 'pi-new', status: 'DRAFT' }),
      },
    };
    service = new PortfolioService(mockPrismaWrite, mockPrismaRead);
  });

  describe('create', () => {
    it('should create portfolio item with auto-slug', async () => {
      const result = await service.create({
        title: 'My Website',
        contentFormat: 'MARKDOWN',
        content: 'Description',
      } as any);
      expect(result.id).toBe('pi-new');
    });
  });

  describe('findPublished', () => {
    it('should return published items', async () => {
      const result = await service.findPublished({ page: 1, limit: 20 } as any);
      expect(result.items).toHaveLength(1);
      expect(result.totalItems).toBe(1);
    });
  });

  describe('findByIdOrSlug', () => {
    it('should find by slug', async () => {
      const result = await service.findByIdOrSlug('website');
      expect(result.slug).toBe('website');
    });

    it('should throw for non-existent item', async () => {
      mockPrismaRead.portfolioItem.findFirst.mockResolvedValue(null);
      await expect(service.findByIdOrSlug('invalid')).rejects.toThrow();
    });
  });

  describe('getFeatured', () => {
    it('should return featured items, filling from published items if needed', async () => {
      mockPrismaRead.portfolioItem.findMany
        .mockResolvedValueOnce([mockItem])
        .mockResolvedValueOnce([]);

      const result = await service.getFeatured(5);
      expect(result).toHaveLength(1);
      expect(mockPrismaRead.portfolioItem.findMany).toHaveBeenCalledTimes(2);
    });
  });
});
