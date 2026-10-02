import { AuditService } from '../../src/services/audit.service';

describe('AuditService', () => {
  let service: AuditService;
  let mockPrismaWrite: any;
  let mockPrismaRead: any;

  const mockLog = {
    id: 'log-1',
    action: 'LOGIN',
    category: 'AUTH',
    description: 'User logged in',
    userId: 'user-1',
    createdAt: new Date(),
    user: { id: 'user-1', name: 'John', email: 'test@example.com' },
  };

  beforeEach(() => {
    mockPrismaRead = {
      auditLog: {
        findMany: jest.fn().mockResolvedValue([mockLog]),
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockResolvedValue(mockLog),
        groupBy: jest.fn().mockResolvedValue([{ action: 'LOGIN', _count: { id: 5 } }]),
      },
    };
    mockPrismaWrite = {
      auditLog: { create: jest.fn().mockResolvedValue(mockLog) },
    };
    service = new AuditService(mockPrismaWrite, mockPrismaRead);
  });

  describe('findAll', () => {
    it('should return paginated audit logs', async () => {
      const result = await service.findAll({ page: 1, limit: 50 } as any);
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return audit log by id', async () => {
      const result = await service.findOne('log-1');
      expect(result.action).toBe('LOGIN');
    });

    it('should throw for non-existent log', async () => {
      mockPrismaRead.auditLog.findUnique.mockResolvedValue(null);
      await expect(service.findOne('invalid')).rejects.toThrow();
    });
  });

  describe('getStats', () => {
    it('should return audit statistics', async () => {
      const result = await service.getStats();
      expect(result.totalLogs).toBe(1);
      expect(result.byAction).toBeDefined();
    });
  });

  describe('createLog', () => {
    it('should create an audit log entry', async () => {
      const result = await service.createLog({
        action: 'LOGIN',
        category: 'AUTH',
        description: 'User logged in',
        userId: 'user-1',
      });
      expect(result.action).toBe('LOGIN');
      expect(mockPrismaWrite.auditLog.create).toHaveBeenCalled();
    });
  });
});
