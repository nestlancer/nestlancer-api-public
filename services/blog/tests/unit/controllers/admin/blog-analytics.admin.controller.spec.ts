import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';
import { BlogAnalyticsAdminController } from '../../../../src/controllers/admin/blog-analytics.admin.controller';
import { PrismaReadService } from '@nestlancer/database';

describe('BlogAnalyticsAdminController', () => {
  let controller: BlogAnalyticsAdminController;
  let prismaRead: any;

  beforeEach(async () => {
    prismaRead = {
      blogPost: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { viewCount: 0, likeCount: 0 } }),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({ id: 'post-1', viewCount: 0 }),
      },
      blogComment: {
        count: jest.fn().mockResolvedValue(0),
      },
      postLike: {
        count: jest.fn().mockResolvedValue(0),
      },
      outbox: {
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlogAnalyticsAdminController],
      providers: [
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
            getAllAndOverride: jest.fn(),
            getAllAndMerge: jest.fn(),
          },
        },
        { provide: PrismaReadService, useValue: prismaRead },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<BlogAnalyticsAdminController>(BlogAnalyticsAdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAnalytics', () => {
    it('should return mock analytics', async () => {
      const result = await controller.getAnalytics({});
      expect(result).toEqual({
        totalViews: 0,
        totalLikes: 0,
        topPosts: [],
        period: '30d',
      });
    });
  });
});
