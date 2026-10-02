import { Test, TestingModule } from '@nestjs/testing';
import { PostsPublicController } from '../../../../src/controllers/public/posts.public.controller';
import { PostsService } from '../../../../src/services/posts.service';
import { PostSearchService } from '../../../../src/services/post-search.service';
import { PostViewsService } from '../../../../src/services/post-views.service';
import { PostFeaturedImageService } from '../../../../src/services/post-featured-image.service';
import { QueryPostsDto } from '../../../../src/dto/query-posts.dto';
import { SearchPostsDto } from '../../../../src/dto/search-posts.dto';

describe('PostsPublicController', () => {
  let controller: PostsPublicController;
  let postsService: jest.Mocked<PostsService>;
  let searchService: jest.Mocked<PostSearchService>;
  let viewsService: jest.Mocked<PostViewsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostsPublicController],
      providers: [
        {
          provide: PostsService,
          useValue: {
            findPublished: jest.fn(),
            findBySlug: jest.fn(),
            findPublishedBySlug: jest.fn(),
          },
        },
        {
          provide: PostSearchService,
          useValue: {
            search: jest.fn(),
          },
        },
        {
          provide: PostViewsService,
          useValue: {
            recordView: jest.fn(),
          },
        },
        {
          provide: PostFeaturedImageService,
          useValue: { enrichPosts: jest.fn(async (items: unknown[]) => items) },
        },
      ],
    }).compile();

    controller = module.get<PostsPublicController>(PostsPublicController);
    postsService = module.get(PostsService);
    searchService = module.get(PostSearchService);
    viewsService = module.get(PostViewsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('list', () => {
    it('should call postsService.findPublished', async () => {
      const mockResult = { data: [], total: 0 };
      postsService.findPublished.mockResolvedValue(mockResult as any);

      const query: QueryPostsDto = { page: 1, limit: 10 };
      const result = await controller.list(query);

      expect(postsService.findPublished).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockResult);
    });
  });

  describe('search', () => {
    it('should call searchService.search', async () => {
      const mockResult = { items: [], total: 0 };
      searchService.search.mockResolvedValue(mockResult as any);

      const query: SearchPostsDto = { q: 'test' };
      const result = await controller.search(query);

      expect(searchService.search).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getDetail', () => {
    it('should fetch post by slug without recording a view', async () => {
      const mockPost = { id: 'post1', slug: 'my-post', viewCount: 5 };
      postsService.findPublishedBySlug.mockResolvedValue(mockPost as any);

      const result = await controller.getDetail('my-post');

      expect(postsService.findPublishedBySlug).toHaveBeenCalledWith('my-post');
      expect(viewsService.recordView).not.toHaveBeenCalled();
      expect(result).toEqual(mockPost);
    });
  });
});
