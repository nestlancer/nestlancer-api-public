import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';
import { PostInteractionsController } from '../../../../src/controllers/user/post-interactions.controller';
import { PostInteractionsService } from '../../../../src/services/post-interactions.service';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';

describe('PostInteractionsController', () => {
  let controller: PostInteractionsController;
  let interactionsService: jest.Mocked<PostInteractionsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostInteractionsController],
      providers: [
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
            getAllAndOverride: jest.fn(),
            getAllAndMerge: jest.fn(),
          },
        },
        {
          provide: PostInteractionsService,
          useValue: {
            toggleLike: jest.fn(),
            addBookmark: jest.fn(),
            removeBookmark: jest.fn(),
          },
        },
        { provide: PrismaWriteService, useValue: {} },
        { provide: PrismaReadService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<PostInteractionsController>(PostInteractionsController);
    interactionsService = module.get(PostInteractionsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('toggleLike', () => {
    it('should call interactionsService.toggleLike', async () => {
      interactionsService.toggleLike.mockResolvedValue({ liked: true } as any);
      const req = { user: { id: 'user1' } };

      const result = await controller.toggleLike('post-slug', req);

      expect(interactionsService.toggleLike).toHaveBeenCalledWith('post-slug', 'user1');
      expect(result).toEqual({ liked: true });
    });
  });

  describe('addBookmark', () => {
    it('should call interactionsService.addBookmark', async () => {
      interactionsService.addBookmark.mockResolvedValue({ bookmarked: true } as any);
      const req = { user: { id: 'user1' } };

      const result = await controller.addBookmark('post-slug', req);

      expect(interactionsService.addBookmark).toHaveBeenCalledWith('post-slug', 'user1');
      expect(result).toEqual({ bookmarked: true });
    });
  });

  describe('removeBookmark', () => {
    it('should call interactionsService.removeBookmark', async () => {
      interactionsService.removeBookmark.mockResolvedValue({ bookmarked: false } as any);
      const req = { user: { id: 'user1' } };

      const result = await controller.removeBookmark('post-slug', req);

      expect(interactionsService.removeBookmark).toHaveBeenCalledWith('post-slug', 'user1');
      expect(result).toEqual({ bookmarked: false });
    });
  });
});
