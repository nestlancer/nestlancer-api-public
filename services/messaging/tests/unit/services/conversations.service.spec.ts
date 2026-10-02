import { ConversationsService } from '../../../src/services/conversations.service';

describe('ConversationsService', () => {
  let service: ConversationsService;
  let mockPrismaRead: {
    project: { findMany: jest.Mock };
    chatThreadMember: { findMany: jest.Mock };
    chatThread: { findMany: jest.Mock };
  };
  let mockStints: {
    getStintsGroupedByThread: jest.Mock;
    getMembershipStatus: jest.Mock;
    findLatestVisibleMessage: jest.Mock;
  };
  let mockUserPrefs: {
    getPrefsForUserThreads: jest.Mock;
    isHidden: jest.Mock;
    isUserArchived: jest.Mock;
  };

  beforeEach(() => {
    mockPrismaRead = {
      project: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'proj-1',
            title: 'Website Build',
            status: 'IN_PROGRESS',
            updatedAt: new Date(),
            messages: [
              {
                id: 'msg-1',
                content: 'Latest message',
                createdAt: new Date(),
                sender: { id: 'client-1', firstName: 'Jane', lastName: 'Doe', avatar: null },
              },
            ],
          },
        ]),
      },
      chatThreadMember: {
        findMany: jest.fn().mockResolvedValue([{ threadId: 'thread-1' }]),
      },
      chatThread: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'thread-1',
            type: 'DIRECT',
            title: null,
            updatedAt: new Date(),
            members: [
              {
                userId: 'user-1',
                user: { id: 'user-1', firstName: 'Admin', lastName: 'User', avatar: null },
              },
              {
                userId: 'client-1',
                user: { id: 'client-1', firstName: 'Patel', lastName: 'Chemicals', avatar: null },
              },
            ],
            messages: [
              {
                id: 'msg-2',
                content: 'Thanks for reaching out',
                createdAt: new Date(),
                readBy: [],
                sender: { id: 'client-1', firstName: 'Patel', lastName: 'Chemicals', avatar: null },
              },
            ],
          },
        ]),
      },
    };
    mockStints = {
      getStintsGroupedByThread: jest
        .fn()
        .mockResolvedValue(
          new Map([
            [
              'thread-1',
              [{ joinedAt: new Date(), leftAt: null, userSentMessage: true, leftReason: null }],
            ],
          ]),
        ),
      getMembershipStatus: jest.fn().mockReturnValue('ACTIVE'),
      findLatestVisibleMessage: jest.fn().mockResolvedValue({
        id: 'msg-2',
        content: 'Thanks for reaching out',
        createdAt: new Date(),
        readBy: [],
        sender: { id: 'client-1', firstName: 'Patel', lastName: 'Chemicals', avatar: null },
      }),
    };
    mockUserPrefs = {
      getPrefsForUserThreads: jest.fn().mockResolvedValue(new Map()),
      isHidden: jest.fn().mockReturnValue(false),
      isUserArchived: jest.fn().mockReturnValue(false),
    };
    service = new ConversationsService(
      mockPrismaRead as never,
      mockStints as never,
      mockUserPrefs as never,
    );
  });

  describe('getConversations', () => {
    it('should return conversations with latest message', async () => {
      const result = await service.getConversations('user-1', { page: 1, limit: 20 });
      expect(result.items).toHaveLength(2);

      const thread = result.items.find((item) => item.kind === 'THREAD');
      const project = result.items.find((item) => item.kind === 'PROJECT');

      expect(thread).toMatchObject({
        kind: 'THREAD',
        threadId: 'thread-1',
        title: 'Patel Chemicals',
        participantIds: ['user-1', 'client-1'],
      });
      expect(thread?.latestMessage).toMatchObject({
        content: 'Thanks for reaching out',
        sender: { firstName: 'Patel', lastName: 'Chemicals' },
      });
      expect(project).toMatchObject({
        kind: 'PROJECT',
        projectId: 'proj-1',
      });
      expect(project?.latestMessage).toBeDefined();
    });

    it('should handle empty conversations', async () => {
      mockPrismaRead.project.findMany.mockResolvedValue([]);
      mockPrismaRead.chatThreadMember.findMany.mockResolvedValue([]);
      mockPrismaRead.chatThread.findMany.mockResolvedValue([]);
      mockStints.getStintsGroupedByThread.mockResolvedValue(new Map());
      mockStints.findLatestVisibleMessage.mockResolvedValue(null);

      const result = await service.getConversations('user-1', { page: 1, limit: 20 });

      expect(result.items).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });
});
