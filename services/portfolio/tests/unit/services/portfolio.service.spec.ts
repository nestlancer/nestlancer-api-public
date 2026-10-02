import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioService } from '../../../src/services/portfolio.service';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { NotFoundException } from '@nestjs/common';
import { PortfolioStatus } from '@nestlancer/common';

describe('PortfolioService', () => {
  let service: PortfolioService;
  let prismaWrite: jest.Mocked<PrismaWriteService>;
  let prismaRead: jest.Mocked<PrismaReadService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioService,
        {
          provide: PrismaWriteService,
          useValue: {
            portfolioItem: { create: jest.fn() },
          },
        },
        {
          provide: PrismaReadService,
          useValue: {
            portfolioItem: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<PortfolioService>(PortfolioService);
    prismaWrite = module.get(PrismaWriteService);
    prismaRead = module.get(PrismaReadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create portfolio portfolioItem and generated slug', async () => {
      prismaWrite.portfolioItem.create.mockResolvedValue({ id: '1', slug: 'test-item' } as any);

      const result = await service.create({ title: 'Test Item', categoryId: 'c1' } as any);

      expect(prismaWrite.portfolioItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Test Item',
            slug: 'test-item',
            categoryId: 'c1',
            status: PortfolioStatus.DRAFT,
            order: 0,
          }),
        }),
      );
      expect(result.id).toBe('1');
    });

    it('should parse tags and create image relations if provided', async () => {
      prismaWrite.portfolioItem.create.mockResolvedValue({ id: '1' } as any);
      await service.create({ title: 'T', tags: ['A', 'B'], imageIds: ['img1'] } as any);

      expect(prismaWrite.portfolioItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tags: ['a', 'b'],
            images: { create: [{ mediaId: 'img1', order: 0 }] },
          }),
        }),
      );
    });
  });

  describe('findPublished', () => {
    it('should return paginated published items', async () => {
      prismaRead.portfolioItem.findMany.mockResolvedValue([{ id: '1' }] as any);
      prismaRead.portfolioItem.count.mockResolvedValue(1);

      const result = await service.findPublished({
        page: 1,
        limit: 10,
        categoryId: 'c1',
        featured: true,
      });

      expect(prismaRead.portfolioItem.findMany).toHaveBeenCalledWith({
        where: {
          status: PortfolioStatus.PUBLISHED,
          deletedAt: null,
          visibility: 'PUBLIC',
          categoryId: 'c1',
          featured: true,
        },
        skip: 0,
        take: 10,
        orderBy: [{ featured: 'desc' }, { order: 'asc' }, { createdAt: 'desc' }],
        include: { category: true },
      });
      expect(result.items).toHaveLength(1);
      expect(result.totalItems).toBe(1);
    });
  });

  describe('findByIdOrSlug', () => {
    it('should throw NotFoundException if no item found', async () => {
      prismaRead.portfolioItem.findFirst.mockResolvedValue(null);
      await expect(service.findByIdOrSlug('test')).rejects.toThrow(NotFoundException);
    });

    it('should find by id if UUID', async () => {
      prismaRead.portfolioItem.findFirst.mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
      } as any);
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      await service.findByIdOrSlug(uuid);
      expect(prismaRead.portfolioItem.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: uuid },
        }),
      );
    });

    it('should find by slug if not UUID', async () => {
      prismaRead.portfolioItem.findFirst.mockResolvedValue({ id: '1' } as any);
      await service.findByIdOrSlug('my-slug');
      expect(prismaRead.portfolioItem.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: 'my-slug' },
        }),
      );
    });
  });

  describe('getFeatured', () => {
    it('should return featured items and backfill with published work', async () => {
      prismaRead.portfolioItem.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'published-1' }] as any);

      const result = await service.getFeatured(5);

      expect(prismaRead.portfolioItem.findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: expect.objectContaining({
            status: PortfolioStatus.PUBLISHED,
            featured: true,
            visibility: 'PUBLIC',
          }),
          take: 5,
        }),
      );
      expect(prismaRead.portfolioItem.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: expect.objectContaining({
            status: PortfolioStatus.PUBLISHED,
            featured: false,
            visibility: 'PUBLIC',
          }),
          take: 5,
        }),
      );
      expect(result).toHaveLength(1);
    });
  });
});
