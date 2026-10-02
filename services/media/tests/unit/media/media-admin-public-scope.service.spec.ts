import { MediaAdminPublicScopeService } from '../../../src/media/media-admin-public-scope.service';

describe('MediaAdminPublicScopeService', () => {
  let service: MediaAdminPublicScopeService;
  let mockPrismaRead: any;

  beforeEach(() => {
    mockPrismaRead = {
      media: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([{ id: 'explicit-1' }])
          .mockResolvedValueOnce([
            { id: 'explicit-1' },
            { id: 'blog-img-1' },
            { id: 'portfolio-img-1' },
            { id: 'hero-1' },
          ]),
      },
      blogPost: {
        findMany: jest.fn().mockResolvedValue([{ featuredImageId: 'blog-img-1' }]),
      },
      portfolioImage: {
        findMany: jest.fn().mockResolvedValue([{ mediaId: 'portfolio-img-1' }]),
      },
      portfolioItem: {
        findMany: jest.fn().mockResolvedValue([{ thumbnailId: 'hero-1', videoId: null }]),
      },
    };
    service = new MediaAdminPublicScopeService(mockPrismaRead);
  });

  it('merges blog, portfolio, and explicit public media ids', async () => {
    const scope = await service.resolvePublicScope();
    expect(scope.ids.sort()).toEqual(
      ['blog-img-1', 'explicit-1', 'hero-1', 'portfolio-img-1'].sort(),
    );
    expect(scope.blogIds).toEqual(['blog-img-1']);
    expect(scope.portfolioIds).toEqual(['portfolio-img-1', 'hero-1']);
  });

  it('buildPublicWhere filters by blog source', async () => {
    const where = await service.buildPublicWhere({ contextType: 'blog' });
    expect(where).toEqual({ id: { in: ['blog-img-1'] } });
  });
});
