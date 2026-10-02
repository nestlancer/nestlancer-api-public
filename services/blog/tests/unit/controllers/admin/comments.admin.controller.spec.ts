import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';
import { CommentsAdminController } from '../../../../src/controllers/admin/comments.admin.controller';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';

describe('CommentsAdminController', () => {
  let controller: CommentsAdminController;
  let prismaRead: any;
  let prismaWrite: any;

  beforeEach(async () => {
    prismaRead = {
      blogComment: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      outbox: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    prismaWrite = {
      blogComment: {
        update: jest
          .fn()
          .mockImplementation(({ where, data }) =>
            Promise.resolve({ id: where.id, status: data.status }),
          ),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsAdminController],
      providers: [
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
            getAllAndOverride: jest.fn(),
            getAllAndMerge: jest.fn(),
          },
        },
        { provide: PrismaWriteService, useValue: prismaWrite },
        { provide: PrismaReadService, useValue: prismaRead },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<CommentsAdminController>(CommentsAdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPendingComments', () => {
    it('should return an empty pending list', async () => {
      const result = await controller.getPendingComments();
      expect(result).toEqual({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });
    });
  });

  describe('approve', () => {
    it('should return APPROVED status', async () => {
      const result = await controller.approve('1');
      expect(result).toEqual({ id: '1', status: 'APPROVED' });
    });
  });

  describe('reject', () => {
    it('should return REJECTED status', async () => {
      const result = await controller.reject('1');
      expect(result).toEqual({ id: '1', status: 'REJECTED' });
    });
  });

  describe('markAsSpam', () => {
    it('should return SPAM status', async () => {
      const result = await controller.markAsSpam('1');
      expect(result).toEqual({ id: '1', status: 'SPAM' });
    });
  });
});
