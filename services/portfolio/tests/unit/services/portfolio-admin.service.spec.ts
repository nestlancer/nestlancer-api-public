import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioAdminService } from '../../../src/services/portfolio-admin.service';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { NotFoundException } from '@nestjs/common';
import { PortfolioStatus } from '@nestlancer/common';
import { PortfolioVisibility } from '@prisma/client';
import { BulkOperation } from '../../../src/dto/bulk-update-portfolio.dto';
import { Visibility } from '../../../src/dto/update-privacy.dto';

describe('PortfolioAdminService', () => {
  let service: PortfolioAdminService;
  let prismaWrite: jest.Mocked<PrismaWriteService>;
  let prismaRead: jest.Mocked<PrismaReadService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioAdminService,
        {
          provide: PrismaWriteService,
          useValue: {
            portfolioItem: {
              update: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
              updateMany: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
        {
          provide: PrismaReadService,
          useValue: {
            portfolioItem: {
              findMany: jest.fn(),
              count: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<PortfolioAdminService>(PortfolioAdminService);
    prismaWrite = module.get(PrismaWriteService);
    prismaRead = module.get(PrismaReadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated portfolio items', async () => {
      prismaRead.portfolioItem.findMany.mockResolvedValue([{ id: '1' }] as any);
      prismaRead.portfolioItem.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10, status: 'PUBLISHED' });

      expect(prismaRead.portfolioItem.findMany).toHaveBeenCalledWith({
        where: { status: 'PUBLISHED' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { category: true },
      });
      expect(result.items).toHaveLength(1);
      expect(result.totalItems).toBe(1);
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if item not found', async () => {
      prismaRead.portfolioItem.findUnique.mockResolvedValue(null);
      await expect(service.findById('1')).rejects.toThrow(NotFoundException);
    });

    it('should return item', async () => {
      prismaRead.portfolioItem.findUnique.mockResolvedValue({ id: '1' } as any);
      const result = await service.findById('1');
      expect(result).toEqual({ id: '1' });
    });
  });

  describe('update', () => {
    it('should update portfolio item', async () => {
      prismaRead.portfolioItem.findUnique.mockResolvedValue({ id: '1' } as any);
      prismaWrite.portfolioItem.update.mockResolvedValue({ id: '1', title: 'New' } as any);

      const result = await service.update('1', { title: 'New', categoryId: 'c1' });

      expect(prismaWrite.portfolioItem.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { title: 'New', categoryId: 'c1' },
        include: { category: true },
      });
      expect(result.title).toBe('New');
    });
  });

  describe('softDelete', () => {
    it('should soft delete item and set to ARCHIVED', async () => {
      prismaRead.portfolioItem.findUnique.mockResolvedValue({ id: '1' } as any);

      await service.softDelete('1');

      expect(prismaWrite.portfolioItem.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { deletedAt: expect.any(Date), status: PortfolioStatus.ARCHIVED },
      });
    });
  });

  describe('hardDelete', () => {
    it('should delete item', async () => {
      prismaRead.portfolioItem.findUnique.mockResolvedValue({ id: '1' } as any);

      await service.hardDelete('1');

      expect(prismaWrite.portfolioItem.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });
  });

  describe('publish', () => {
    it('should publish item', async () => {
      prismaRead.portfolioItem.findUnique.mockResolvedValue({ id: '1' } as any);

      await service.publish('1');

      expect(prismaWrite.portfolioItem.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          status: PortfolioStatus.PUBLISHED,
          visibility: PortfolioVisibility.PUBLIC,
          publishedAt: expect.any(Date),
        },
      });
    });
  });

  describe('unpublish', () => {
    it('should unpublish item', async () => {
      prismaRead.portfolioItem.findUnique.mockResolvedValue({ id: '1' } as any);

      await service.unpublish('1');

      expect(prismaWrite.portfolioItem.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          status: PortfolioStatus.DRAFT,
          visibility: PortfolioVisibility.PRIVATE,
          publishedAt: null,
        },
      });
    });
  });

  describe('archive', () => {
    it('should archive item', async () => {
      prismaRead.portfolioItem.findUnique.mockResolvedValue({ id: '1' } as any);

      await service.archive('1');

      expect(prismaWrite.portfolioItem.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: PortfolioStatus.ARCHIVED },
      });
    });
  });

  describe('toggleFeatured', () => {
    it('should toggle featured status', async () => {
      prismaRead.portfolioItem.findUnique.mockResolvedValue({ id: '1', featured: false } as any);

      await service.toggleFeatured('1');

      expect(prismaWrite.portfolioItem.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { featured: true },
      });
    });
  });

  describe('updatePrivacy', () => {
    it('should update item privacy', async () => {
      prismaRead.portfolioItem.findUnique.mockResolvedValue({ id: '1' } as any);

      await service.updatePrivacy('1', { visibility: Visibility.PRIVATE });

      expect(prismaWrite.portfolioItem.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { visibility: PortfolioVisibility.PRIVATE },
      });
    });
  });

  describe('duplicate', () => {
    it('should duplicate item with new slug', async () => {
      const mockItem = { id: '1', title: 'Test', slug: 'test-slug', categoryId: 'c1' };
      prismaRead.portfolioItem.findUnique.mockResolvedValue(mockItem as any);
      prismaWrite.portfolioItem.create.mockResolvedValue({ id: '2' } as any);

      await service.duplicate('1');

      expect(prismaWrite.portfolioItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Test (Copy)',
          slug: expect.stringMatching(/^test-slug-copy-\d+$/),
          status: PortfolioStatus.DRAFT,
          categoryId: 'c1',
        }),
      });
    });
  });

  describe('bulkUpdate', () => {
    it('should handle PUBLISH operation', async () => {
      await service.bulkUpdate({ operation: BulkOperation.PUBLISH, ids: ['1', '2'] });
      expect(prismaWrite.portfolioItem.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['1', '2'] } },
        data: expect.objectContaining({ status: PortfolioStatus.PUBLISHED }),
      });
    });

    it('should handle DELETE operation', async () => {
      await service.bulkUpdate({ operation: BulkOperation.DELETE, ids: ['1', '2'] });
      expect(prismaWrite.portfolioItem.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['1', '2'] } },
      });
    });

    it('should throw for unknown operation', async () => {
      await expect(service.bulkUpdate({ operation: 'UNKNOWN' as any, ids: [] })).rejects.toThrow(
        'Unknown bulk operation: UNKNOWN',
      );
    });
  });
});
