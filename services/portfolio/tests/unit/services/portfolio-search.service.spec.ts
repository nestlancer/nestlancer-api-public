import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioSearchService } from '../../../src/services/portfolio-search.service';
import { PrismaReadService } from '@nestlancer/database';
import { PortfolioStatus } from '@nestlancer/common';
import { SearchPortfolioDto } from '../../../src/dto/search-portfolio.dto';

describe('PortfolioSearchService', () => {
  let service: PortfolioSearchService;
  let prismaRead: jest.Mocked<PrismaReadService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioSearchService,
        {
          provide: PrismaReadService,
          useValue: {
            portfolioItem: { findMany: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<PortfolioSearchService>(PortfolioSearchService);
    prismaRead = module.get(PrismaReadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    it('should search published items with query', async () => {
      prismaRead.portfolioItem.findMany.mockResolvedValue([{ id: '1', title: 'test' }] as any);

      const dto: SearchPortfolioDto = { q: 'test query', categoryId: 'c1' };
      const result = await service.search(dto);

      expect(prismaRead.portfolioItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: PortfolioStatus.PUBLISHED,
            categoryId: 'c1',
            OR: [
              { title: { contains: 'test query', mode: 'insensitive' } },
              { shortDescription: { contains: 'test query', mode: 'insensitive' } },
            ],
          }),
          take: 50,
        }),
      );
      expect(result).toHaveLength(1);
    });

    it('should search without categoryId', async () => {
      prismaRead.portfolioItem.findMany.mockResolvedValue([]);

      const dto: SearchPortfolioDto = { q: 'test' };
      await service.search(dto);

      expect(prismaRead.portfolioItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: PortfolioStatus.PUBLISHED,
            OR: [
              { title: { contains: 'test', mode: 'insensitive' } },
              { shortDescription: { contains: 'test', mode: 'insensitive' } },
            ],
          }),
        }),
      );
      // should omit categoryId
      const call = prismaRead.portfolioItem.findMany.mock.calls[0][0];
      expect(call.where).not.toHaveProperty('categoryId');
    });

    it('rejects a null-byte query before Prisma', async () => {
      await expect(service.search({ q: '\0' })).rejects.toThrow(
        'q must not contain control characters',
      );
      expect(prismaRead.portfolioItem.findMany).not.toHaveBeenCalled();
    });
  });
});
