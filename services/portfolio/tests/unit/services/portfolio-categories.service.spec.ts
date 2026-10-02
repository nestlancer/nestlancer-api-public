import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioCategoriesService } from '../../../src/services/portfolio-categories.service';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('PortfolioCategoriesService', () => {
  let service: PortfolioCategoriesService;
  let prismaWrite: jest.Mocked<PrismaWriteService>;
  let prismaRead: jest.Mocked<PrismaReadService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioCategoriesService,
        {
          provide: PrismaWriteService,
          useValue: {
            portfolioCategory: {
              create: jest.fn(),
              upsert: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            portfolioItem: { updateMany: jest.fn() },
          },
        },
        {
          provide: PrismaReadService,
          useValue: {
            portfolioCategory: { findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<PortfolioCategoriesService>(PortfolioCategoriesService);
    prismaWrite = module.get(PrismaWriteService);
    prismaRead = module.get(PrismaReadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should fetch all categories with items count', async () => {
      prismaRead.portfolioCategory.findMany.mockResolvedValue([{ id: '1' }] as any);
      const result = await service.findAll();
      expect(prismaRead.portfolioCategory.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if not found', async () => {
      prismaRead.portfolioCategory.findUnique.mockResolvedValue(null);
      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });

    it('should return category', async () => {
      prismaRead.portfolioCategory.findUnique.mockResolvedValue({ id: '1' } as any);
      const result = await service.findOne('1');
      expect(result).toEqual({ id: '1' });
    });
  });

  describe('create', () => {
    it('should upsert category and generate slug if not provided', async () => {
      prismaWrite.portfolioCategory.upsert.mockResolvedValue({ id: '1', slug: 'web-dev' } as any);

      const result = await service.create({ name: 'Web Dev', description: 'desc' });

      expect(prismaWrite.portfolioCategory.upsert).toHaveBeenCalledWith({
        where: { slug: 'web-dev' },
        create: { name: 'Web Dev', slug: 'web-dev', description: 'desc', order: 0 },
        update: { name: 'Web Dev', description: 'desc', order: 0 },
      });
      expect(result.id).toBe('1');
    });
  });

  describe('update', () => {
    it('should throw ConflictException if new name or slug exists', async () => {
      prismaRead.portfolioCategory.findFirst.mockResolvedValue({ id: '2' } as any);
      await expect(service.update('1', { name: 'Existing' })).rejects.toThrow(ConflictException);
    });

    it('should update category', async () => {
      prismaRead.portfolioCategory.findFirst.mockResolvedValue(null);
      prismaWrite.portfolioCategory.update.mockResolvedValue({ id: '1', name: 'New Name' } as any);

      const result = await service.update('1', { name: 'New Name' });

      expect(prismaWrite.portfolioCategory.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({ name: 'New Name', slug: 'new-name' }),
      });
      expect(result.name).toBe('New Name');
    });
  });

  describe('delete', () => {
    it('should throw BadRequestException if category has items and no reassignToId', async () => {
      prismaRead.portfolioCategory.findUnique.mockResolvedValue({
        id: '1',
        _count: { items: 5 },
      } as any);
      await expect(service.delete('1')).rejects.toThrow(BadRequestException);
    });

    it('should reassign items and then delete category', async () => {
      prismaRead.portfolioCategory.findUnique.mockResolvedValue({
        id: '1',
        _count: { items: 5 },
      } as any);
      prismaWrite.portfolioItem.updateMany.mockResolvedValue({ count: 5 } as any);
      prismaWrite.portfolioCategory.delete.mockResolvedValue({ id: '1' } as any);

      await service.delete('1', '2');

      expect(prismaWrite.portfolioItem.updateMany).toHaveBeenCalledWith({
        where: { categoryId: '1' },
        data: { categoryId: '2' },
      });
      expect(prismaWrite.portfolioCategory.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should delete without reassigning if no items', async () => {
      prismaRead.portfolioCategory.findUnique.mockResolvedValue({
        id: '1',
        _count: { items: 0 },
      } as any);

      await service.delete('1');

      expect(prismaWrite.portfolioItem.updateMany).not.toHaveBeenCalled();
      expect(prismaWrite.portfolioCategory.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });
  });
});
