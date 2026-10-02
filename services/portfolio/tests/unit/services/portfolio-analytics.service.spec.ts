import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioAnalyticsService } from '../../../src/services/portfolio-analytics.service';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { CacheService } from '@nestlancer/cache';
import { ConfigService } from '@nestjs/config';

describe('PortfolioAnalyticsService', () => {
  let service: PortfolioAnalyticsService;
  let prismaWrite: jest.Mocked<PrismaWriteService>;
  let prismaRead: jest.Mocked<PrismaReadService>;
  let cacheService: jest.Mocked<CacheService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioAnalyticsService,
        {
          provide: PrismaWriteService,
          useValue: {
            portfolioItem: { update: jest.fn(), findUnique: jest.fn() },
          },
        },
        {
          provide: PrismaReadService,
          useValue: {
            portfolioItem: { aggregate: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PortfolioAnalyticsService>(PortfolioAnalyticsService);
    prismaWrite = module.get(PrismaWriteService);
    prismaRead = module.get(PrismaReadService);
    cacheService = module.get(CacheService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trackView', () => {
    it('should increment view count if not debounced', async () => {
      configService.get.mockReturnValue(1); // 1 hour
      cacheService.get.mockResolvedValue(null);
      prismaWrite.portfolioItem.update.mockResolvedValue({ viewCount: 6 } as any);

      await service.trackView('item1', 'hash123');

      expect(cacheService.get).toHaveBeenCalledWith('portfolio_view:item1:hash123');
      expect(prismaWrite.portfolioItem.update).toHaveBeenCalledWith({
        where: { id: 'item1' },
        data: { viewCount: { increment: 1 } },
        select: { viewCount: true },
      });
      expect(cacheService.set).toHaveBeenCalledWith('portfolio_view:item1:hash123', '1', 3600);
    });

    it('should not increment view count if debounced', async () => {
      configService.get.mockReturnValue(1);
      cacheService.get.mockResolvedValue('1');
      prismaRead.portfolioItem.findUnique.mockResolvedValue({ viewCount: 5 } as any);

      await service.trackView('item1', 'hash123');

      expect(prismaWrite.portfolioItem.update).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('getGlobalAnalytics', () => {
    it('should return aggregated global analytics', async () => {
      prismaRead.portfolioItem.aggregate.mockResolvedValue({
        _sum: { viewCount: 50, likeCount: 10 },
      } as any);
      prismaRead.portfolioItem.findMany.mockResolvedValue([{ id: '1' }] as any);

      const result = await service.getGlobalAnalytics();

      expect(prismaRead.portfolioItem.aggregate).toHaveBeenCalled();
      expect(prismaRead.portfolioItem.findMany).toHaveBeenCalled();
      expect(result).toEqual({ totalViews: 50, totalLikes: 10, topItems: [{ id: '1' }] });
    });
  });

  describe('getItemAnalytics', () => {
    it('should return analytics for given item', async () => {
      prismaRead.portfolioItem.findUnique.mockResolvedValue({
        viewCount: 5,
        likeCount: 1,
        createdAt: new Date(),
      } as any);

      const result = await service.getItemAnalytics('item1');

      expect(prismaRead.portfolioItem.findUnique).toHaveBeenCalledWith({
        where: { id: 'item1' },
        select: { viewCount: true, likeCount: true, createdAt: true },
      });
      expect(result.viewCount).toBe(5);
    });
  });
});
