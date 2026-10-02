import { Test, TestingModule } from '@nestjs/testing';
import { MessageSearchService } from '../../../src/services/message-search.service';
import { PrismaReadService } from '@nestlancer/database';
import { ThreadMemberStintService } from '../../../src/services/thread-member-stint.service';

describe('MessageSearchService', () => {
  let service: MessageSearchService;
  let prismaRead: jest.Mocked<PrismaReadService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageSearchService,
        {
          provide: PrismaReadService,
          useValue: {
            message: { findMany: jest.fn(), count: jest.fn() },
          },
        },
        {
          provide: ThreadMemberStintService,
          useValue: {
            getStintsForUserThread: jest.fn().mockResolvedValue([]),
            buildMessageVisibilityWhere: jest.fn().mockReturnValue(null),
          },
        },
      ],
    }).compile();

    service = module.get<MessageSearchService>(MessageSearchService);
    prismaRead = module.get(PrismaReadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchMessages', () => {
    it('should return empty items if query is empty', async () => {
      const result = await service.searchMessages('p1', '');
      expect(result.items).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(prismaRead.message.findMany).not.toHaveBeenCalled();
    });

    it('should search messages with query and pagination', async () => {
      const mockResult = [{ id: '1', content: 'test message' }];
      prismaRead.message.findMany.mockResolvedValue(mockResult as any);
      prismaRead.message.count.mockResolvedValue(1);

      const result = await service.searchMessages('p1', 'test query', 2, 10);

      expect(prismaRead.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            projectId: 'p1',
            content: { contains: 'test query', mode: 'insensitive' },
          }),
          skip: 10,
          take: 10,
        }),
      );
      expect(result.items).toEqual(mockResult);
      expect(result.meta.page).toBe(2);
      expect(result.meta.total).toBe(1);
    });
  });
});
