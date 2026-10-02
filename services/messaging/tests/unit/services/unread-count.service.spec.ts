import { Test, TestingModule } from '@nestjs/testing';
import { UnreadCountService } from '../../../src/services/unread-count.service';
import { PrismaReadService } from '@nestlancer/database';
import { CacheService } from '@nestlancer/cache';
import { ThreadUserPrefsService } from '../../../src/services/thread-user-prefs.service';

describe('UnreadCountService', () => {
  let provider: UnreadCountService;
  let prismaRead: {
    chatThreadMember: { findMany: jest.Mock };
    chatThreadMemberStint: { findMany: jest.Mock };
    chatThread: { findMany: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let cacheService: { get: jest.Mock; set: jest.Mock };

  beforeEach(async () => {
    prismaRead = {
      chatThreadMember: { findMany: jest.fn().mockResolvedValue([]) },
      chatThreadMemberStint: { findMany: jest.fn().mockResolvedValue([]) },
      chatThread: { findMany: jest.fn().mockResolvedValue([]) },
      $queryRaw: jest.fn().mockResolvedValue([{ count: 0 }]),
    };
    cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnreadCountService,
        { provide: PrismaReadService, useValue: prismaRead },
        { provide: CacheService, useValue: cacheService },
        {
          provide: ThreadUserPrefsService,
          useValue: {
            getPrefsForUserThreads: jest.fn().mockResolvedValue(new Map()),
            isHidden: jest.fn().mockReturnValue(false),
            isUserArchived: jest.fn().mockReturnValue(false),
          },
        },
      ],
    }).compile();

    provider = module.get<UnreadCountService>(UnreadCountService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('returns zero when user has no hub-visible threads', async () => {
    const result = await provider.getUnreadCount('user-1');
    expect(result).toEqual({ totalUnread: 0 });
    expect(prismaRead.$queryRaw).not.toHaveBeenCalled();
    expect(cacheService.set).toHaveBeenCalled();
  });

  it('uses SQL count when thread scope exists and caches result', async () => {
    prismaRead.chatThreadMember.findMany.mockResolvedValue([{ threadId: 't1' }]);
    prismaRead.chatThread.findMany.mockResolvedValue([{ id: 't1', archivedAt: null }]);
    prismaRead.$queryRaw.mockResolvedValue([{ count: 3 }]);

    const result = await provider.getUnreadCount('user-1');

    expect(prismaRead.$queryRaw).toHaveBeenCalled();
    expect(result).toEqual({ totalUnread: 3 });
    expect(cacheService.set).toHaveBeenCalledWith(
      'messaging:unread:user-1',
      { totalUnread: 3 },
      45,
    );
  });

  it('returns cached value without hitting the database', async () => {
    cacheService.get.mockResolvedValue({ totalUnread: 9 });
    const result = await provider.getUnreadCount('user-1');
    expect(result).toEqual({ totalUnread: 9 });
    expect(prismaRead.chatThreadMember.findMany).not.toHaveBeenCalled();
  });
});
