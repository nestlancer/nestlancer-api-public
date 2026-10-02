import { Test, TestingModule } from '@nestjs/testing';
import { PostViewsService } from '../../../src/services/post-views.service';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { CacheService } from '@nestlancer/cache';
import { ConfigService } from '@nestjs/config';

describe('PostViewsService', () => {
  let service: PostViewsService;
  let prismaWrite: jest.Mocked<PrismaWriteService>;
  let cacheService: jest.Mocked<CacheService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostViewsService,
        {
          provide: PrismaWriteService,
          useValue: {
            blogPost: {
              update: jest.fn().mockResolvedValue({ viewCount: 11 }),
            },
          },
        },
        {
          provide: PrismaReadService,
          useValue: {
            blogPost: {
              findUnique: jest.fn().mockResolvedValue({ viewCount: 10 }),
            },
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            setIfAbsent: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PostViewsService>(PostViewsService);
    prismaWrite = module.get(PrismaWriteService);
    cacheService = module.get(CacheService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordView', () => {
    it('should increment view count if not recently viewed', async () => {
      configService.get.mockReturnValue(1); // 1 hour debounce
      cacheService.setIfAbsent.mockResolvedValue(true);

      const result = await service.recordView('post-1', 'viewer-key-a');

      expect(result.recorded).toBe(true);
      expect(cacheService.setIfAbsent).toHaveBeenCalledWith('blog_view:post-1:viewer-key-a', '1', 3600);
      expect(prismaWrite.blogPost.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { viewCount: { increment: 1 } },
        select: { viewCount: true },
      });
    });

    it('should not increment view count if recently viewed', async () => {
      configService.get.mockReturnValue(1); // 1 hour debounce
      cacheService.setIfAbsent.mockResolvedValue(false);

      const result = await service.recordView('post-1', 'viewer-key-b');

      expect(result.recorded).toBe(false);
      expect(result.viewCount).toBe(10);
      expect(cacheService.setIfAbsent).toHaveBeenCalledWith('blog_view:post-1:viewer-key-b', '1', 3600);
      expect(prismaWrite.blogPost.update).not.toHaveBeenCalled();
    });
  });
});
