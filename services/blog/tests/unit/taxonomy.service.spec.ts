import { CategoriesService } from '../../src/services/categories.service';
import { TagsService } from '../../src/services/tags.service';
import { AuthorsService } from '../../src/services/authors.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let mockPrismaRead: any;
  let mockPrismaWrite: any;

  beforeEach(() => {
    mockPrismaRead = {
      blogCategory: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'cat-1',
            name: 'Tech',
            slug: 'tech',
            description: null,
            createdAt: new Date(),
            _count: { posts: 5 },
          },
        ]),
        findUnique: jest.fn().mockResolvedValue({
          id: 'cat-1',
          name: 'Tech',
          slug: 'tech',
          description: null,
          createdAt: new Date(),
          _count: { posts: 5 },
        }),
      },
    };
    mockPrismaWrite = {
      blogCategory: {
        create: jest.fn().mockResolvedValue({
          id: 'cat-new',
          name: 'Design',
          slug: 'design',
          description: null,
          createdAt: new Date(),
          _count: { posts: 0 },
        }),
      },
    };
    service = new CategoriesService(mockPrismaRead, mockPrismaWrite);
  });

  it('should return all categories', async () => {
    jest.spyOn(service as unknown as { readPool: () => { query: () => Promise<unknown> } }, 'readPool').mockReturnValue({
      query: async () => ({
        rows: [
          {
            id: 'cat-1',
            name: 'Tech',
            slug: 'tech',
            description: null,
            createdAt: new Date(),
            postCount: 5,
          },
        ],
      }),
    });
    const result = await service.findAll();
    expect(result).toHaveLength(1);
    expect(result[0].postCount).toBe(5);
  });

  it('should find category by slug', async () => {
    const result = await service.findBySlug('tech');
    expect(result.name).toBe('Tech');
  });

  it('should throw for non-existent slug', async () => {
    mockPrismaRead.blogCategory.findUnique.mockResolvedValue(null);
    await expect(service.findBySlug('invalid')).rejects.toThrow();
  });
});

describe('TagsService', () => {
  let service: TagsService;
  let mockPrismaRead: any;
  let mockPrismaWrite: any;

  beforeEach(() => {
    mockPrismaRead = {
      blogTag: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'tag-1',
            name: 'javascript',
            slug: 'javascript',
            createdAt: new Date(),
            _count: { posts: 10 },
          },
        ]),
        findUnique: jest.fn().mockResolvedValue({
          id: 'tag-1',
          name: 'javascript',
          slug: 'javascript',
          createdAt: new Date(),
          _count: { posts: 10 },
        }),
      },
    };
    mockPrismaWrite = {
      blogTag: {
        upsert: jest.fn().mockResolvedValue({
          id: 'tag-new',
          name: 'react',
          slug: 'react',
          createdAt: new Date(),
          _count: { posts: 0 },
        }),
        create: jest.fn().mockResolvedValue({
          id: 'tag-new',
          name: 'react',
          slug: 'react',
          createdAt: new Date(),
          _count: { posts: 0 },
        }),
      },
    };
    service = new TagsService(mockPrismaRead, mockPrismaWrite);
  });

  it('should return all tags', async () => {
    const result = await service.findAll();
    expect(result[0].postCount).toBe(10);
  });

  it('should find popular tags', async () => {
    const result = await service.findPopular(5);
    expect(result).toHaveLength(1);
  });

  it('should create tag', async () => {
    const result = await service.create({ name: 'react', slug: 'react' });
    expect(result.name).toBe('react');
  });
});

describe('AuthorsService', () => {
  let service: AuthorsService;
  let mockPrismaRead: any;

  beforeEach(() => {
    mockPrismaRead = {
      user: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'u-1', name: 'John', email: 'john@test.com', _count: { blogPosts: 3 } },
          ]),
        findUnique: jest.fn().mockResolvedValue({
          id: 'u-1',
          name: 'John',
          email: 'john@test.com',
          _count: { blogPosts: 3 },
        }),
      },
    };
    service = new AuthorsService(mockPrismaRead);
  });

  it('should return all authors', async () => {
    const result = await service.findAll();
    expect(result[0].postCount).toBe(3);
  });

  it('should throw for non-existent author', async () => {
    mockPrismaRead.user.findUnique.mockResolvedValue(null);
    await expect(service.findById('invalid')).rejects.toThrow();
  });
});
