import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';
import { CommentsController } from '../../../../src/controllers/user/comments.controller';
import { CommentsService } from '../../../../src/services/comments.service';
import { CreateCommentDto, UpdateCommentDto } from '../../../../src/dto/create-comment.dto';
import { PrismaReadService } from '@nestlancer/database';

describe('CommentsController', () => {
  let controller: CommentsController;
  let commentsService: jest.Mocked<CommentsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
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
          provide: CommentsService,
          useValue: {
            create: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        { provide: PrismaReadService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<CommentsController>(CommentsController);
    commentsService = module.get(CommentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call commentsService.create', async () => {
      commentsService.create.mockResolvedValue({ id: '1' } as any);
      const dto: CreateCommentDto = { content: 'Nice post' };
      const req = { user: { id: 'user1' } };

      const result = await controller.create('my-post', dto, req);

      expect(commentsService.create).toHaveBeenCalledWith('my-post', 'user1', dto);
      expect(result).toEqual({ id: '1' });
    });
  });

  describe('updatePut', () => {
    it('should call commentsService.update', async () => {
      commentsService.update.mockResolvedValue({ id: '1', content: 'Updated' } as any);
      const dto: UpdateCommentDto = { content: 'Updated' };
      const req = { user: { id: 'user1' } };

      const result = await controller.updatePut('1', dto, req);

      expect(commentsService.update).toHaveBeenCalledWith('1', 'user1', dto);
      expect(result).toEqual({ id: '1', content: 'Updated' });
    });
  });

  describe('remove', () => {
    it('should call commentsService.softDelete', async () => {
      commentsService.softDelete.mockResolvedValue({ deleted: true } as any);
      const req = { user: { id: 'user1' } };

      const result = await controller.remove('1', req);

      expect(commentsService.softDelete).toHaveBeenCalledWith('1', 'user1');
      expect(result).toEqual({ deleted: true });
    });
  });
});
