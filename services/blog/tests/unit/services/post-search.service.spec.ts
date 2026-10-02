import { Test, TestingModule } from '@nestjs/testing';
import { PostSearchService } from '../../../src/services/post-search.service';
import { PostFeaturedImageService } from '../../../src/services/post-featured-image.service';
import { PrismaReadService } from '@nestlancer/database';
import { SearchPostsDto } from '../../../src/dto/search-posts.dto';

describe('PostSearchService', () => {
  let service: PostSearchService;
  let prismaRead: jest.Mocked<PrismaReadService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostSearchService,
        {
          provide: PrismaReadService,
          useValue: {
            blogPost: {
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: PostFeaturedImageService,
          useValue: { enrichPosts: jest.fn(async (items: unknown[]) => items) },
        },
      ],
    }).compile();

    service = module.get<PostSearchService>(PostSearchService);
    prismaRead = module.get(PrismaReadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    it('should find posts with matching terms', async () => {
      const mockResult = [{ id: '1', title: 'NestJS is awesome' }];
      prismaRead.blogPost.findMany.mockResolvedValue(mockResult as any);

      const dto: SearchPostsDto = { q: 'NestJS' };
      const result = await service.search(dto);

      expect(prismaRead.blogPost.findMany).toHaveBeenCalledWith({
        where: {
          status: 'PUBLISHED',
          OR: [
            { title: { contains: 'NestJS', mode: 'insensitive' } },
            { excerpt: { contains: 'NestJS', mode: 'insensitive' } },
            { content: { contains: 'NestJS', mode: 'insensitive' } },
          ],
        },
        take: 20,
      });

      expect(result).toEqual(mockResult);
    });

    it('rejects a null-byte query before Prisma', async () => {
      await expect(service.search({ q: '\0' })).rejects.toThrow(
        'q must not contain control characters',
      );
      expect(prismaRead.blogPost.findMany).not.toHaveBeenCalled();
    });
  });
});
