import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';
import { PostsAdminController } from '../../../../src/controllers/admin/posts.admin.controller';
import { BlogAdminService } from '../../../../src/services/blog-admin.service';
import { PostsService } from '../../../../src/services/posts.service';
import { PostPublishingService } from '../../../../src/services/post-publishing.service';
import { PostSchedulingService } from '../../../../src/services/post-scheduling.service';
import { CreatePostDto, ContentFormat } from '../../../../src/dto/create-post.dto';
import { UpdatePostDto } from '../../../../src/dto/update-post.dto';
import { SchedulePostDto } from '../../../../src/dto/schedule-post.dto';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';

describe('PostsAdminController', () => {
  let controller: PostsAdminController;
  let adminService: jest.Mocked<BlogAdminService>;
  let postsService: jest.Mocked<PostsService>;
  let publishingService: jest.Mocked<PostPublishingService>;
  let schedulingService: jest.Mocked<PostSchedulingService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostsAdminController],
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
          provide: BlogAdminService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: PostsService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: PostPublishingService,
          useValue: {
            publish: jest.fn(),
            unpublish: jest.fn(),
          },
        },
        {
          provide: PostSchedulingService,
          useValue: {
            schedule: jest.fn(),
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

    controller = module.get<PostsAdminController>(PostsAdminController);
    adminService = module.get(BlogAdminService);
    postsService = module.get(PostsService);
    publishingService = module.get(PostPublishingService);
    schedulingService = module.get(PostSchedulingService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call adminService.findAll', async () => {
      adminService.findAll.mockResolvedValue({
        items: [],
        totalItems: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      } as any);
      await controller.findAll({ query: 'test' });
      expect(adminService.findAll).toHaveBeenCalledWith({ query: 'test' });
    });
  });

  describe('create', () => {
    it('should set authorId if not provided and call postsService.create', async () => {
      const dto: CreatePostDto = {
        title: 'Test',
        content: 'Test',
        excerpt: 'Test',
        contentFormat: ContentFormat.MARKDOWN,
      };
      const req = { user: { id: 'admin1' } };
      postsService.create.mockResolvedValue({ id: '1' } as any);

      const result = await controller.create(dto, req);

      expect(dto.authorId).toBe('admin1');
      expect(postsService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: '1' });
    });
  });

  describe('update', () => {
    it('should call adminService.update', async () => {
      const dto: UpdatePostDto = { title: 'New' };
      adminService.update.mockResolvedValue({} as any);
      await controller.update('1', dto);
      expect(adminService.update).toHaveBeenCalledWith('1', dto);
    });
  });

  describe('publish', () => {
    it('should call publishingService.publish', async () => {
      publishingService.publish.mockResolvedValue({} as any);
      await controller.publish('1');
      expect(publishingService.publish).toHaveBeenCalledWith('1');
    });
  });

  describe('schedule', () => {
    it('should call schedulingService.schedule', async () => {
      const dto: SchedulePostDto = { scheduledAt: '2027-01-01T00:00:00Z' };
      schedulingService.schedule.mockResolvedValue({} as any);

      await controller.schedule('1', dto);

      expect(schedulingService.schedule).toHaveBeenCalledWith('1', expect.any(Date));
    });
  });
});
