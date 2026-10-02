import { PortfolioCategoriesService } from '../../src/services/portfolio-categories.service';

describe('PortfolioCategoriesService', () => {
  let service: PortfolioCategoriesService;
  let mockPrismaWrite: any;
  let mockPrismaRead: any;

  beforeEach(() => {
    mockPrismaRead = {
      portfolioCategory: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'cat-1', name: 'Web', slug: 'web', _count: { items: 3 } }]),
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'cat-1', name: 'Web', slug: 'web', _count: { items: 3 } }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    mockPrismaWrite = {
      portfolioCategory: {
        create: jest.fn().mockResolvedValue({ id: 'cat-new', name: 'Mobile', slug: 'mobile' }),
        upsert: jest.fn().mockResolvedValue({ id: 'cat-new', name: 'Mobile', slug: 'mobile' }),
        update: jest.fn().mockResolvedValue({ id: 'cat-1', name: 'Updated' }),
        delete: jest.fn().mockResolvedValue({}),
      },
      portfolioItem: { updateMany: jest.fn().mockResolvedValue({ count: 3 }) },
    };
    service = new PortfolioCategoriesService(mockPrismaWrite, mockPrismaRead);
  });

  describe('findAll', () => {
    it('should return categories with item counts', async () => {
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('should create category with auto-slug', async () => {
      const result = await service.create({ name: 'Mobile', description: 'Mobile apps' } as any);
      expect(result.id).toBe('cat-new');
      expect(mockPrismaWrite.portfolioCategory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: 'mobile' },
          create: expect.objectContaining({ name: 'Mobile', slug: 'mobile' }),
        }),
      );
    });

    it('should upsert when slug already exists', async () => {
      mockPrismaWrite.portfolioCategory.upsert.mockResolvedValue({
        id: 'existing',
        name: 'Web',
        slug: 'web',
      });
      const result = await service.create({ name: 'Web' } as any);
      expect(result.id).toBe('existing');
      expect(mockPrismaWrite.portfolioCategory.upsert).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should reject deletion with items unless reassigning', async () => {
      await expect(service.delete('cat-1')).rejects.toThrow();
    });

    it('should reassign items and delete', async () => {
      await service.delete('cat-1', 'cat-2');
      expect(mockPrismaWrite.portfolioItem.updateMany).toHaveBeenCalled();
      expect(mockPrismaWrite.portfolioCategory.delete).toHaveBeenCalled();
    });
  });
});
