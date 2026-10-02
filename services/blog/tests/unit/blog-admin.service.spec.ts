import { BlogAdminService } from '../../src/services/blog-admin.service';

describe('BlogAdminService', () => {
  let service: BlogAdminService;
  let mockPrismaWrite: any;
  let mockPrismaRead: any;

  const mockPost = {
    id: 'post-1',
    title: 'Test',
    slug: 'test',
    status: 'PUBLISHED',
    category: { name: 'Tech' },
    tags: [],
  };

  beforeEach(() => {
    mockPrismaRead = {
      blogPost: {
        findMany: jest.fn().mockResolvedValue([mockPost]),
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockResolvedValue(mockPost),
      },
    };
    mockPrismaWrite = {
      blogPost: {
        update: jest.fn().mockResolvedValue({ ...mockPost, title: 'Updated' }),
      },
    };
    service = new BlogAdminService(mockPrismaWrite, mockPrismaRead, {
      get: jest.fn().mockReturnValue(200),
    } as any);
  });

  describe('findAll', () => {
    it('should return paginated posts', async () => {
      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result.items).toHaveLength(1);
    });

    it('should search admin posts by title, slug, and excerpt', async () => {
      await service.findAll({ page: 1, limit: 20, search: 'nestjs' });

      expect(mockPrismaRead.blogPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'nestjs', mode: 'insensitive' } },
              { slug: { contains: 'nestjs', mode: 'insensitive' } },
              { excerpt: { contains: 'nestjs', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should find post by id', async () => {
      const result = await service.findById('post-1');
      expect(result.title).toBe('Test');
    });

    it('should throw for non-existent post', async () => {
      mockPrismaRead.blogPost.findUnique.mockResolvedValue(null);
      await expect(service.findById('invalid')).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update post', async () => {
      const result = await service.update('post-1', { title: 'Updated' } as any);
      expect(result.title).toBe('Updated');
    });
  });

  describe('softDelete', () => {
    it('should archive post', async () => {
      await service.softDelete('post-1');
      expect(mockPrismaWrite.blogPost.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'ARCHIVED' }) }),
      );
    });
  });
});
