import { NotificationsService } from '../../../src/notifications/notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockPrismaWrite: any;
  let mockPrismaRead: any;

  const mockNotification = {
    id: 'notif-1',
    userId: 'user-1',
    type: 'INFO',
    readAt: null,
    dismissedAt: null,
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockPrismaRead = {
      notification: {
        findMany: jest.fn().mockResolvedValue([mockNotification]),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    mockPrismaWrite = {
      notification: {
        findFirst: jest.fn().mockResolvedValue(mockNotification),
        update: jest.fn().mockResolvedValue({ ...mockNotification, readAt: new Date() }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    service = new NotificationsService(mockPrismaWrite, mockPrismaRead);
  });

  describe('findByUser', () => {
    it('should return paginated notifications', async () => {
      const result = await service.findByUser('user-1', { page: 1, limit: 20 } as any);
      expect(result.data).toHaveLength(1);
    });

    it('should return correct pagination meta (total, page, limit order)', async () => {
      mockPrismaRead.notification.count.mockResolvedValue(42);
      const result = await service.findByUser('user-1', { page: 2, limit: 10 } as any);
      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        totalItems: 42,
        totalPages: 5,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      const result = await service.getUnreadCount('user-1');
      expect(result.count).toBe(1);
    });
  });

  describe('markRead', () => {
    it('should mark notification as read', async () => {
      const result = await service.markRead('notif-1', 'user-1', true);
      expect(result.readAt).toBeDefined();
    });

    it('should throw for non-existent notification', async () => {
      mockPrismaWrite.notification.findFirst.mockResolvedValue(null);
      await expect(service.markRead('invalid', 'user-1', true)).rejects.toThrow();
    });
  });

  describe('markAllRead', () => {
    it('should mark all notifications as read', async () => {
      await service.markAllRead('user-1');
      expect(mockPrismaWrite.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1', readAt: null }),
        }),
      );
    });
  });

  describe('softDelete', () => {
    it('should delete notification', async () => {
      await service.softDelete('notif-1', 'user-1');
      expect(mockPrismaWrite.notification.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'notif-1', userId: 'user-1' } }),
      );
    });
  });
});
