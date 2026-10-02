import { SessionsService } from '../../../src/services/sessions.service';

describe('SessionsService', () => {
  let service: SessionsService;
  let mockPrismaWrite: any;
  let mockPrismaRead: any;

  const mockSessions = [
    {
      id: 'session-1',
      userId: 'user-1',
      token: 'refresh-jti-current',
      deviceInfo: { lastAccessJti: 'access-jti-current', browser: 'Chrome', os: 'macOS', type: 'desktop' },
      userAgent: 'Mozilla/5.0 Chrome/120',
      ip: '127.0.0.1',
      createdAt: new Date(),
      lastActiveAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
    },
    {
      id: 'session-2',
      userId: 'user-1',
      token: 'refresh-jti-other',
      deviceInfo: { lastAccessJti: 'access-jti-other', browser: 'Firefox', os: 'Windows', type: 'desktop' },
      userAgent: 'Mozilla/5.0 Firefox/120',
      ip: '192.168.1.1',
      createdAt: new Date(),
      lastActiveAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
    },
  ];

  beforeEach(() => {
    mockPrismaRead = {
      session: {
        findMany: jest.fn().mockResolvedValue(mockSessions),
        findUnique: jest.fn().mockResolvedValue(mockSessions[1]),
      },
    };
    mockPrismaWrite = {
      session: {
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    service = new SessionsService(mockPrismaWrite, mockPrismaRead);
  });

  describe('getSessions', () => {
    it('should return formatted session list and mark current via lastAccessJti', async () => {
      const result = await service.getSessions('user-1', 'access-jti-current');
      expect(result).toHaveLength(2);
      expect(result[0].current).toBe(true);
      expect(result[1].current).toBe(false);
    });

    it('should include device info parsed from user agent', async () => {
      const result = await service.getSessions('user-1', 'access-jti-current');
      expect(result[0].device).toBeDefined();
      expect(result[0].device.browser).toBeDefined();
    });

    it('should include location info', async () => {
      const result = await service.getSessions('user-1', 'access-jti-current');
      expect(result[0].location.ip).toBe('127.0.0.1');
    });
  });

  describe('terminateSession', () => {
    it('should terminate another session', async () => {
      const result = await service.terminateSession('user-1', 'session-2', 'access-jti-current');
      expect(result.sessionId).toBe('session-2');
      expect(result.terminatedAt).toBeDefined();
      expect(mockPrismaWrite.session.update).toHaveBeenCalledWith({
        where: { id: 'session-2' },
        data: { expiresAt: expect.any(Date) },
      });
    });

    it('should throw when trying to terminate current session', async () => {
      mockPrismaRead.session.findUnique.mockResolvedValue(mockSessions[0]);

      await expect(
        service.terminateSession('user-1', 'session-1', 'access-jti-current'),
      ).rejects.toThrow();
    });

    it('should throw for non-existent session', async () => {
      mockPrismaRead.session.findUnique.mockResolvedValue(null);

      await expect(
        service.terminateSession('user-1', 'invalid', 'access-jti-current'),
      ).rejects.toThrow();
    });

    it('should throw for session belonging to another user', async () => {
      mockPrismaRead.session.findUnique.mockResolvedValue({
        ...mockSessions[1],
        userId: 'other-user',
      });

      await expect(
        service.terminateSession('user-1', 'session-2', 'access-jti-current'),
      ).rejects.toThrow();
    });
  });

  describe('terminateOtherSessions', () => {
    it('should revoke all sessions except current (NL-BUG-AUTH-7)', async () => {
      const result = await service.terminateOtherSessions('user-1', 'access-jti-current');
      expect(result).toBe(true);
      expect(mockPrismaRead.session.findMany).toHaveBeenCalled();
      expect(mockPrismaWrite.session.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['session-2'] },
        },
        data: { expiresAt: expect.any(Date) },
      });
    });
  });
});
