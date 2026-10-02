import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioPublicController } from '../../../../src/controllers/public/portfolio.public.controller';
import { PortfolioService } from '../../../../src/services/portfolio.service';
import { PortfolioCategoriesService } from '../../../../src/services/portfolio-categories.service';
import { PortfolioSearchService } from '../../../../src/services/portfolio-search.service';
import { PortfolioAnalyticsService } from '../../../../src/services/portfolio-analytics.service';
import { PortfolioLikesService } from '../../../../src/services/portfolio-likes.service';
import { PortfolioPublicMapperService } from '../../../../src/services/portfolio-public-mapper.service';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';

describe('PortfolioPublicController', () => {
  let controller: PortfolioPublicController;
  let portfolioService: jest.Mocked<PortfolioService>;
  let categoriesService: jest.Mocked<PortfolioCategoriesService>;
  let searchService: jest.Mocked<PortfolioSearchService>;
  let analyticsService: jest.Mocked<PortfolioAnalyticsService>;
  let likesService: jest.Mocked<PortfolioLikesService>;
  let publicMapper: jest.Mocked<PortfolioPublicMapperService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortfolioPublicController],
      providers: [
        {
          provide: Reflector,
          useValue: { get: jest.fn(), getAllAndOverride: jest.fn(), getAllAndMerge: jest.fn() },
        },
        {
          provide: PortfolioService,
          useValue: {
            findPublished: jest.fn(),
            getFeatured: jest.fn(),
            findByIdOrSlug: jest.fn(),
          },
        },
        {
          provide: PortfolioCategoriesService,
          useValue: {
            findAll: jest.fn(),
          },
        },
        {
          provide: PortfolioSearchService,
          useValue: {
            search: jest.fn(),
          },
        },
        {
          provide: PortfolioAnalyticsService,
          useValue: {
            trackView: jest.fn(),
          },
        },
        {
          provide: PortfolioLikesService,
          useValue: {
            toggleLike: jest.fn(),
          },
        },
        {
          provide: PortfolioPublicMapperService,
          useValue: {
            toPublicItem: jest.fn(async (item: unknown) => item),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PortfolioPublicController>(PortfolioPublicController);
    portfolioService = module.get(PortfolioService);
    categoriesService = module.get(PortfolioCategoriesService);
    searchService = module.get(PortfolioSearchService);
    analyticsService = module.get(PortfolioAnalyticsService);
    likesService = module.get(PortfolioLikesService);
    publicMapper = module.get(PortfolioPublicMapperService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('list', () => {
    it('should call portfolioService.findPublished', async () => {
      portfolioService.findPublished.mockResolvedValue({ items: [] } as any);

      const result = await controller.list({} as any);

      expect(portfolioService.findPublished).toHaveBeenCalled();
      expect(result).toHaveProperty('items');
    });
  });

  describe('getFeatured', () => {
    it('should call portfolioService.getFeatured', async () => {
      portfolioService.getFeatured.mockResolvedValue([]);

      const result = await controller.getFeatured();

      expect(portfolioService.getFeatured).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('getCategories', () => {
    it('should call categoriesService.findAll', async () => {
      categoriesService.findAll.mockResolvedValue([]);

      const result = await controller.getCategories();

      expect(categoriesService.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('getTags', () => {
    it('should extract tags from published items', async () => {
      portfolioService.findPublished.mockResolvedValue({
        items: [{ tags: ['react', 'node'] }, { tags: ['node', 'aws'] }, { tags: null }],
      } as any);

      const result = await controller.getTags();

      expect(result).toEqual(expect.arrayContaining(['react', 'node', 'aws']));
      expect(result.length).toBe(3);
    });
  });

  describe('search', () => {
    it('should call searchService.search', async () => {
      searchService.search.mockResolvedValue({ items: [] } as any);

      const result = await controller.search({} as any);

      expect(searchService.search).toHaveBeenCalled();
      expect(result).toHaveProperty('items');
    });
  });

  describe('getDetail', () => {
    it('should fetch item and map to public response', async () => {
      portfolioService.findByIdOrSlug.mockResolvedValue({ id: '1' } as any);

      const result = await controller.getDetail('1');

      expect(portfolioService.findByIdOrSlug).toHaveBeenCalledWith('1', { publicOnly: true });
      expect(publicMapper.toPublicItem).toHaveBeenCalledWith({ id: '1' });
      expect(result).toEqual({ id: '1' });
    });
  });

  describe('recordView', () => {
    it('should fetch item and track view', async () => {
      portfolioService.findByIdOrSlug.mockResolvedValue({ id: '1' } as any);
      analyticsService.trackView.mockResolvedValue({ recorded: true, viewCount: 2 } as any);

      const req = { ip: '127.0.0.1', headers: {} };
      const expectedIpHash = Buffer.from('127.0.0.1').toString('base64');

      const result = await controller.recordView('1', req as any);

      expect(portfolioService.findByIdOrSlug).toHaveBeenCalledWith('1', { publicOnly: true });
      expect(analyticsService.trackView).toHaveBeenCalledWith('1', expectedIpHash);
      expect(result).toEqual({ success: true, recorded: true, viewCount: 2 });
    });
  });

  describe('toggleLike', () => {
    it('should call likesService.toggleLike', async () => {
      portfolioService.findByIdOrSlug.mockResolvedValue({ id: '1' } as any);
      likesService.toggleLike.mockResolvedValue({ liked: true } as any);

      const req = { ip: '127.0.0.1', user: { userId: 'u1' } };
      const expectedIpHash = Buffer.from('127.0.0.1').toString('base64');

      const result = await controller.toggleLike('1', req as any);

      expect(likesService.toggleLike).toHaveBeenCalledWith('1', 'u1', expectedIpHash);
      expect(result).toEqual({ liked: true });
    });
  });
});
