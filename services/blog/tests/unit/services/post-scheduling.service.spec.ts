import { Test, TestingModule } from '@nestjs/testing';
import { PostSchedulingService } from '../../../src/services/post-scheduling.service';
import { PrismaWriteService } from '@nestlancer/database';

describe('PostSchedulingService', () => {
  let service: PostSchedulingService;
  let prismaWrite: jest.Mocked<PrismaWriteService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostSchedulingService,
        {
          provide: PrismaWriteService,
          useValue: {
            blogPost: {
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<PostSchedulingService>(PostSchedulingService);
    prismaWrite = module.get(PrismaWriteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('schedule', () => {
    it('should update post with scheduledAt date', async () => {
      const scheduleDate = new Date();
      prismaWrite.blogPost.update.mockResolvedValue({ id: '1', scheduledAt: scheduleDate } as any);

      const result = await service.schedule('1', scheduleDate);

      expect(prismaWrite.blogPost.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { scheduledAt: scheduleDate },
      });
      expect(result.scheduledAt).toEqual(scheduleDate);
    });
  });
});
