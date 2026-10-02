import { MessagingService } from '../../../src/services/messaging.service';

describe('MessagingService', () => {
  let service: MessagingService;
  let mockPrismaWrite: any;
  let mockPrismaRead: any;
  let mockOutbox: any;
  let mockAccess: any;
  let mockRealtime: { publish: jest.Mock };

  beforeEach(() => {
    mockAccess = {
      requireProjectMessagingAllowed: jest.fn().mockResolvedValue({ id: 'proj-1' }),
      requireProjectParticipant: jest.fn().mockResolvedValue({ id: 'proj-1' }),
      requireThreadMember: jest.fn().mockResolvedValue({}),
      requireMessageAccess: jest
        .fn()
        .mockResolvedValue({ id: 'msg-1', projectId: 'proj-1', threadId: null }),
    };
    mockPrismaRead = {
      message: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'msg-1', content: 'Hello', senderId: 'user-1' }]),
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockResolvedValue({
          id: 'msg-1',
          content: 'Hello',
          senderId: 'user-1',
          deletedAt: null,
          projectId: 'proj-1',
          threadId: null,
        }),
      },
    };
    mockPrismaWrite = {
      $transaction: jest.fn().mockImplementation(async (fn: any) => {
        const tx = {
          message: {
            create: jest.fn().mockResolvedValue({
              id: 'msg-new',
              projectId: 'proj-1',
              threadId: null,
              senderId: 'user-1',
              content: 'Test',
              type: 'TEXT',
              createdAt: new Date('2020-01-01T00:00:00.000Z'),
            }),
          },
          outbox: { create: jest.fn().mockResolvedValue({}) },
          chatThread: { update: jest.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      }),
      message: {
        update: jest
          .fn()
          .mockResolvedValue({ id: 'msg-1', content: 'Updated', editedAt: new Date() }),
      },
    };
    mockOutbox = {};
    mockRealtime = { publish: jest.fn() };
    const mockStints = { markUserSentMessage: jest.fn().mockResolvedValue(undefined) };
    const mockUnread = { invalidateForUsers: jest.fn().mockResolvedValue(undefined) };
    mockPrismaRead.project = {
      findUnique: jest.fn().mockResolvedValue({ clientId: 'user-2', adminId: 'admin-1' }),
    };
    mockPrismaRead.chatThreadMember = {
      findMany: jest.fn().mockResolvedValue([{ userId: 'user-1' }, { userId: 'user-2' }]),
    };
    service = new MessagingService(
      mockPrismaWrite,
      mockPrismaRead,
      mockOutbox,
      mockAccess,
      mockRealtime as any,
      mockStints as any,
      mockUnread as any,
    );
  });

  describe('sendMessage', () => {
    it('should send a text message', async () => {
      const result = await service.sendMessage('user-1', {
        projectId: 'proj-1',
        content: 'Test',
        type: 'TEXT',
      } as any);
      expect(result.id).toBe('msg-new');
      expect(mockPrismaWrite.$transaction).toHaveBeenCalled();
      expect(mockRealtime.publish).toHaveBeenCalled();
    });

    it('should throw for empty text message content', async () => {
      await expect(
        service.sendMessage('user-1', { projectId: 'proj-1', content: '', type: 'TEXT' } as any),
      ).rejects.toThrow();
    });
  });

  describe('getMessagesForProject', () => {
    it('should return paginated messages', async () => {
      const result = await service.getMessagesForProject('user-1', 'proj-1', {
        page: 1,
        limit: 50,
      });
      expect(mockAccess.requireProjectMessagingAllowed).toHaveBeenCalledWith('user-1', 'proj-1');
      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('updateMessage', () => {
    it('should update own message', async () => {
      const result = await service.updateMessage('user-1', 'msg-1', { content: 'Updated' } as any);
      expect(result.content).toBe('Updated');
    });

    it("should throw when editing someone else's message", async () => {
      mockPrismaRead.message.findUnique.mockResolvedValue({
        id: 'msg-1',
        senderId: 'other-user',
        deletedAt: null,
      });
      await expect(
        service.updateMessage('user-1', 'msg-1', { content: 'Updated' } as any),
      ).rejects.toThrow();
    });
  });

  describe('deleteMessage', () => {
    it('should soft-delete own message', async () => {
      await service.deleteMessage('user-1', 'msg-1');
      expect(mockPrismaWrite.message.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ content: null }) }),
      );
    });

    it("should throw when deleting someone else's message", async () => {
      mockPrismaRead.message.findUnique.mockResolvedValue({ id: 'msg-1', senderId: 'other-user' });
      await expect(service.deleteMessage('user-1', 'msg-1')).rejects.toThrow();
    });
  });
});
