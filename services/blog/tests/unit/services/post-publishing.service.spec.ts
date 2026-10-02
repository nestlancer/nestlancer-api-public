import { Test, TestingModule } from '@nestjs/testing';
import { PostPublishingService } from '../../../src/services/post-publishing.service';
import { PrismaWriteService } from '@nestlancer/database';
import { OutboxService } from '@nestlancer/outbox';

describe('PostPublishingService', () => {
  let service: PostPublishingService;
  let prismaWrite: jest.Mocked<PrismaWriteService>;
  let outboxService: jest.Mocked<OutboxService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostPublishingService,
        {
          provide: PrismaWriteService,
          useValue: {
            $transaction: jest.fn(),
            blogPost: {
              update: jest.fn(),
            },
          },
        },
        {
          provide: OutboxService,
          useValue: {
            createEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PostPublishingService>(PostPublishingService);
    prismaWrite = module.get(PrismaWriteService);
    outboxService = module.get(OutboxService);

    prismaWrite.$transaction.mockImplementation(async (cb: any) => cb(prismaWrite));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('publish', () => {
    it('should update post status to PUBLISHED and create outbox event', async () => {
      const mockPost = { id: '1' };
      prismaWrite.blogPost.update.mockResolvedValue(mockPost as any);
      outboxService.createEvent.mockResolvedValue({} as any);

      const result = await service.publish('1');

      expect(prismaWrite.$transaction).toHaveBeenCalled();
      expect(prismaWrite.blogPost.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'PUBLISHED', publishedAt: expect.any(Date) },
      });
      expect(outboxService.createEvent).toHaveBeenCalledWith(
        {
          aggregateType: 'BLOG_POST',
          aggregateId: '1',
          type: 'BLOG_POST_PUBLISHED',
          payload: { postId: '1' },
        },
        expect.any(Object),
      );
      expect(result).toEqual(mockPost);
    });
  });

  describe('unpublish', () => {
    it('should update post status to DRAFT', async () => {
      prismaWrite.blogPost.update.mockResolvedValue({ id: '1' } as any);

      const result = await service.unpublish('1');

      expect(prismaWrite.blogPost.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'DRAFT', publishedAt: null },
      });
      expect(result).toEqual({ id: '1' });
    });
  });

  describe('archive', () => {
    it('should update post status to ARCHIVED', async () => {
      prismaWrite.blogPost.update.mockResolvedValue({ id: '1' } as any);

      const result = await service.archive('1');

      expect(prismaWrite.blogPost.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'ARCHIVED' },
      });
      expect(result).toEqual({ id: '1' });
    });
  });
});
