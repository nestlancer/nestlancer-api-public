import { Test, TestingModule } from '@nestjs/testing';
import { PostInteractionsService } from '../../../src/services/post-interactions.service';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { NotFoundException } from '@nestjs/common';

describe('PostInteractionsService', () => {
  let service: PostInteractionsService;
  let prismaWrite: jest.Mocked<PrismaWriteService>;
  let prismaRead: jest.Mocked<PrismaReadService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostInteractionsService,
        {
          provide: PrismaWriteService,
          useValue: {
            postLike: {
              create: jest.fn(),
              delete: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
            },
            blogPost: { update: jest.fn().mockResolvedValue({}) },
            postBookmark: { create: jest.fn(), delete: jest.fn() },
            $transaction: jest.fn(),
          },
        },
        {
          provide: PrismaReadService,
          useValue: {
            blogPost: { findFirst: jest.fn() },
            postLike: { findUnique: jest.fn() },
            postBookmark: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<PostInteractionsService>(PostInteractionsService);
    prismaWrite = module.get(PrismaWriteService);
    prismaRead = module.get(PrismaReadService);

    // Default mock transaction to resolve immediately
    prismaWrite.$transaction.mockImplementation(async (cb) => {
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
    it('should throw NotFoundException if post not found', async () => {
      prismaRead.blogPost.findFirst.mockResolvedValue(null);
      await expect(service.toggleLike('my-post', 'user1')).rejects.toThrow(NotFoundException);
    });

    it('should add like if it does not exist', async () => {
      prismaRead.blogPost.findFirst.mockResolvedValue({ id: '1', likeCount: 0 } as any);
      (prismaWrite.postLike.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaWrite.postLike.count as jest.Mock).mockResolvedValue(1);

      const result = await service.toggleLike('my-post', 'user1');

      expect(prismaWrite.postLike.create).toHaveBeenCalled();
      expect(prismaWrite.blogPost.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { likeCount: 1 },
      });
      expect(result).toEqual({ liked: true, likeCount: 1 });
    });

    it('should remove like if it exists', async () => {
      prismaRead.blogPost.findFirst.mockResolvedValue({ id: '1', likeCount: 1 } as any);
      (prismaWrite.postLike.findUnique as jest.Mock).mockResolvedValue({ id: 'like1' });
      (prismaWrite.postLike.count as jest.Mock).mockResolvedValue(0);

      const result = await service.toggleLike('my-post', 'user1');

      expect(prismaWrite.postLike.delete).toHaveBeenCalledWith({ where: { id: 'like1' } });
      expect(prismaWrite.blogPost.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { likeCount: 0 },
      });
      expect(result).toEqual({ liked: false, likeCount: 0 });
    });

    it('returns the winning like state when a concurrent insert hits the unique constraint', async () => {
      prismaRead.blogPost.findFirst.mockResolvedValue({ id: '1', likeCount: 0 } as any);
      prismaWrite.$transaction.mockRejectedValueOnce(
        Object.assign(new Error('unique'), { code: 'P2002' }),
      );
      (prismaWrite.postLike.findUnique as jest.Mock).mockResolvedValue({ id: 'like1' });
      (prismaWrite.postLike.count as jest.Mock).mockResolvedValue(1);

      const result = await service.toggleLike('my-post', 'user1');

      expect(result).toEqual({ liked: true, likeCount: 1 });
    });
  });

  describe('addBookmark', () => {
    it('should throw NotFoundException if post not found', async () => {
      prismaRead.blogPost.findFirst.mockResolvedValue(null);
      await expect(service.addBookmark('my-post', 'user1')).rejects.toThrow(NotFoundException);
    });

    it('should return bookmarked: true if already bookmarked', async () => {
      prismaRead.blogPost.findFirst.mockResolvedValue({ id: '1' } as any);
      prismaRead.postBookmark.findUnique.mockResolvedValue({ id: 'bm1' } as any);

      const result = await service.addBookmark('my-post', 'user1');

      expect(prismaWrite.postBookmark.create).not.toHaveBeenCalled();
      expect(result).toEqual({ bookmarked: true });
    });

    it('should create bookmark if it does not exist', async () => {
      prismaRead.blogPost.findFirst.mockResolvedValue({ id: '1' } as any);
      prismaRead.postBookmark.findUnique.mockResolvedValue(null);

      const result = await service.addBookmark('my-post', 'user1');

      expect(prismaWrite.postBookmark.create).toHaveBeenCalled();
      expect(result).toEqual({ bookmarked: true });
    });
  });

  describe('removeBookmark', () => {
    it('should delete bookmark if it exists', async () => {
      prismaRead.blogPost.findFirst.mockResolvedValue({ id: '1' } as any);
      prismaRead.postBookmark.findUnique.mockResolvedValue({ id: 'bm1' } as any);

      const result = await service.removeBookmark('my-post', 'user1');

      expect(prismaWrite.postBookmark.delete).toHaveBeenCalledWith({ where: { id: 'bm1' } });
      expect(result).toEqual({ bookmarked: false });
    });
  });

  describe('isLiked', () => {
    it('should return true if liked', async () => {
      prismaRead.blogPost.findFirst.mockResolvedValue({ id: '1' } as any);
      prismaRead.postLike.findUnique.mockResolvedValue({ id: 'like1' } as any);

      const result = await service.isLiked('my-post', 'user1');
      expect(result).toBe(true);
    });
  });

  describe('getUserBookmarks', () => {
    it('should return paginated bookmarks for a user', async () => {
      const mockBookmarks = [{ id: 'bm1', createdAt: new Date(), post: { id: 'p1' } }];
      prismaRead.postBookmark.findMany.mockResolvedValue(mockBookmarks as any);
      prismaRead.postBookmark.count.mockResolvedValue(1);

      const result = await service.getUserBookmarks('user1', 1, 10);

      expect(result.meta.total).toBe(1);
      expect(result.items.length).toBe(1);
      expect(result.items[0].post.id).toBe('p1');
    });
  });
});
