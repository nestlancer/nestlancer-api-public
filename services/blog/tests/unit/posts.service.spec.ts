jest.mock('@nestlancer/database', () => {
  const actual = jest.requireActual('@nestlancer/database');
  const query = jest.fn(async (text: string, params?: unknown[]) => {
    const sql = String(text);
    if (sql.includes('"commentCount"')) {
      if (params?.[0] === 'invalid') return { rows: [] };
      return {
        rows: [
          {
            id: 'post-1',
            title: 'Test Post',
            slug: 'test-post',
            status: 'PUBLISHED',
            excerpt: 'Excerpt',
            content: 'Hello',
            tags: [],
            category: { name: 'Tech' },
            author: { id: 'u1', firstName: 'A', lastName: 'B', avatar: null },
            featuredMedia: null,
            commentCount: 2,
            previous: { id: 'prev', title: 'Older', slug: 'older', publishedAt: new Date() },
            next: { id: 'next', title: 'Newer', slug: 'newer', publishedAt: new Date() },
          },
        ],
      };
    }
    if (sql.includes('"BlogComment"')) {
      return {
        rows: [
          {
            id: 'c1',
            postId: 'post-1',
            authorId: 'u1',
            content: 'Nice',
            parentId: null,
            status: 'APPROVED',
            likes: 0,
            isPinned: false,
            moderationMessage: null,
            createdAt: new Date('2026-01-01T00:00:00Z'),
            updatedAt: new Date('2026-01-01T00:00:00Z'),
            author: { id: 'u1', firstName: 'A', lastName: 'B', avatar: null },
            total: 1,
          },
        ],
      };
    }
    if (sql.includes('COUNT(*)')) return { rows: [{ count: 1 }] };
    return {
      rows: [
        {
          id: 'post-1',
          title: 'Test Post',
          slug: 'test-post',
          status: 'PUBLISHED',
          excerpt: 'Excerpt',
          tags: [],
          category: { name: 'Tech' },
        },
      ],
    };
  });
  (globalThis as { __blogListQuery?: jest.Mock }).__blogListQuery = query;
  return {
    ...actual,
    createPgPool: (_connectionString: string, overrides?: { min?: number; max?: number }) => {
      (globalThis as { __blogPoolOverrides?: unknown[] }).__blogPoolOverrides ??= [];
      (globalThis as { __blogPoolOverrides?: unknown[] }).__blogPoolOverrides!.push(overrides);
      return { query };
    },
  };
});

import { PostsService } from '../../src/services/posts.service';

const query = (globalThis as { __blogListQuery?: jest.Mock }).__blogListQuery!;

describe('PostsService', () => {
  let service: PostsService;
  let mockPrismaWrite: any;
  let mockPrismaRead: any;
  let mockConfigService: any;

  const mockPost = {
    id: 'post-1',
    title: 'Test Post',
    slug: 'test-post',
    status: 'PUBLISHED',
    publishedAt: new Date(),
    category: { name: 'Tech' },
    tags: [],
  };

  beforeEach(() => {
    mockPrismaRead = {
      blogPost: {
        findMany: jest.fn().mockResolvedValue([mockPost]),
        count: jest.fn().mockResolvedValue(1),
        findFirst: jest.fn().mockResolvedValue(mockPost),
      },
    };
    mockPrismaWrite = {
      blogPost: {
        create: jest.fn().mockResolvedValue({ ...mockPost, id: 'post-new', status: 'DRAFT' }),
      },
    };
    mockConfigService = { get: jest.fn().mockReturnValue(200) };
    const mockFeaturedImageService = {
      enrichPosts: jest.fn(async (items: unknown[]) => items),
      enrichPost: jest.fn(async (post: unknown) => post),
    };
    service = new PostsService(
      mockPrismaWrite,
      mockPrismaRead,
      mockConfigService,
      mockFeaturedImageService as any,
    );
  });

  describe('create', () => {
    it('should create post with reading time', async () => {
      const result = await service.create({
        title: 'Test',
        content: 'Hello world this is a test post',
        categoryId: 'cat-1',
      } as any);
      expect(result.id).toBe('post-new');
    });
  });

  describe('onModuleInit', () => {
    it('opens the read pool before the first request and does not force min 0', async () => {
      process.env.DATABASE_READ_URL = 'postgresql://localhost/nestlancer';
      await service.onModuleInit();
      expect(query).toHaveBeenCalledWith('SELECT 1');
      expect(query.mock.calls.filter((call) => call[0] === 'SELECT 1')).toHaveLength(2);
      const overrides = (globalThis as { __blogPoolOverrides?: Array<{ min?: number }> })
        .__blogPoolOverrides;
      expect(overrides?.some((item) => item?.min === 0)).toBe(false);
    });
  });

  describe('findPublished', () => {
    it('should return published posts in one list query without selecting article bodies', async () => {
      process.env.DATABASE_READ_URL = 'postgresql://localhost/nestlancer';
      const result = await service.findPublished({ page: 1, limit: 10 } as any);
      expect(result.items).toHaveLength(1);
      expect(result.totalItems).toBe(1);
      expect(mockPrismaRead.blogPost.findMany).not.toHaveBeenCalled();
      const listCall = query.mock.calls.find((call: unknown[]) => String(call[0]).includes('p.excerpt'));
      const sql = String(listCall?.[0] ?? '');
      expect(sql).toContain('p.excerpt');
      expect(sql).not.toContain('p.content,');
      expect(sql).not.toContain('p."content"');
    });
  });

  describe('findBySlug', () => {
    it('should find post by slug', async () => {
      const result = await service.findBySlug('test-post');
      expect(result.slug).toBe('test-post');
    });

    it('should throw for non-existent slug', async () => {
      mockPrismaRead.blogPost.findFirst.mockResolvedValue(null);
      await expect(service.findBySlug('invalid')).rejects.toThrow();
    });
  });

  describe('findPublishedBySlug', () => {
    it('should find published post by slug with adjacent and commentCount', async () => {
      process.env.DATABASE_READ_URL = 'postgresql://localhost/nestlancer';
      const result = await service.findPublishedBySlug('test-post');
      expect(result.slug).toBe('test-post');
      expect(result.commentCount).toBe(2);
      expect(result.adjacent.previous.slug).toBe('older');
      expect(result.adjacent.next.slug).toBe('newer');
      expect(result.content).toBe('Hello');
      expect(mockPrismaRead.blogPost.findFirst).not.toHaveBeenCalled();
      const detailCall = query.mock.calls.find((call: unknown[]) =>
        String(call[0]).includes('"commentCount"'),
      );
      expect(String(detailCall?.[0] ?? '')).toContain('p.content');
    });

    it('loads approved comments and the total in one read-pool query', async () => {
      process.env.DATABASE_READ_URL = 'postgresql://localhost/nestlancer';
      const result = await service.findApprovedComments('post-1', 0, 20);
      expect(result.total).toBe(1);
      expect(result.data).toEqual([
        expect.objectContaining({
          content: 'Nice',
          author: { id: 'u1', firstName: 'A', lastName: 'B', avatar: null },
        }),
      ]);
      expect(result.data[0].total).toBeUndefined();
      const call = query.mock.calls.find((item: unknown[]) => String(item[0]).includes('"BlogComment"'));
      expect(String(call?.[0] ?? '')).toContain("'APPROVED'");
      expect(call?.[1]).toEqual(['post-1', 20, 0]);
    });

    it('should throw for non-existent published slug', async () => {
      process.env.DATABASE_READ_URL = 'postgresql://localhost/nestlancer';
      await expect(service.findPublishedBySlug('invalid')).rejects.toThrow();
    });
  });
});
