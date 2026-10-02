import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PortfolioLikesService } from '../../../src/services/portfolio-likes.service';
import { PrismaWriteService } from '@nestlancer/database';
import { CacheService } from '@nestlancer/cache';

describe('PortfolioLikesService', () => {
  let service: PortfolioLikesService;
  let prismaWrite: jest.Mocked<PrismaWriteService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioLikesService,
        {
          provide: PrismaWriteService,
          useValue: {
            portfolioLike: { findFirst: jest.fn(), create: jest.fn(), delete: jest.fn() },
            portfolioItem: {
              findUnique: jest.fn().mockResolvedValue({ id: 'item1', likeCount: 1 }),
              update: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            incr: jest.fn().mockResolvedValue(1),
            expire: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((_key: string, defaultValue: unknown) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<PortfolioLikesService>(PortfolioLikesService);
    prismaWrite = module.get(PrismaWriteService);

    prismaWrite.$transaction.mockImplementation(async (cb: any) => {
      if (Array.isArray(cb)) {
        return Promise.all(cb);
      }
      return cb(prismaWrite);
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('toggleLike', () => {
    it('should create like and increment count if not liked', async () => {
      prismaWrite.portfolioLike.findFirst.mockResolvedValue(null);

      const result = await service.toggleLike('item1', 'user1');

      expect(prismaWrite.$transaction).toHaveBeenCalled();
      expect(prismaWrite.portfolioLike.create).toHaveBeenCalledWith({
        data: { portfolioItemId: 'item1', userId: 'user1' },
      });
      expect(prismaWrite.portfolioItem.update).toHaveBeenCalledWith({
        where: { id: 'item1' },
        data: { likeCount: { increment: 1 } },
      });
      expect(result).toEqual({ liked: true, likeCount: 1 });
    });

    it('should delete like and decrement count if already liked (userId)', async () => {
      prismaWrite.portfolioLike.findFirst.mockResolvedValue({ id: 'like1' } as any);

      const result = await service.toggleLike('item1', 'user1');

      expect(prismaWrite.$transaction).toHaveBeenCalled();
      expect(prismaWrite.portfolioLike.delete).toHaveBeenCalledWith({ where: { id: 'like1' } });
      expect(prismaWrite.portfolioItem.update).toHaveBeenCalledWith({
        where: { id: 'item1' },
        data: { likeCount: { decrement: 1 } },
      });
      expect(result).toEqual({ liked: false, likeCount: 1 });
    });

    it('should handle toggle with ipHash', async () => {
      prismaWrite.portfolioLike.findFirst.mockResolvedValue(null);

      const result = await service.toggleLike('item1', undefined, 'ip123');

      expect(prismaWrite.portfolioLike.create).toHaveBeenCalledWith({
        data: { portfolioItemId: 'item1', ipHash: 'ip123' },
      });
      expect(result).toEqual({ liked: true, likeCount: 1 });
    });
  });
});
