import { ConfigService } from '@nestjs/config';
import { MilestonesService } from '../../../src/services/milestones.service';

describe('MilestonesService', () => {
  let service: MilestonesService;
  let mockPrismaWrite: any;
  let mockPrismaRead: any;
  let mockOutbox: any;

  beforeEach(() => {
    mockPrismaRead = {
      milestone: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'ms-1',
          projectId: 'proj-1',
          status: 'IN_PROGRESS',
          name: 'Design',
        }),
        findFirst: jest.fn().mockResolvedValue({ id: 'ms-1', order: 1 }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'deposit-1',
            order: 1,
            name: 'Deposit',
            createdAt: new Date('2026-01-01'),
            status: 'APPROVED',
          },
          {
            id: 'ms-1',
            order: 2,
            name: 'Design',
            createdAt: new Date('2026-01-02'),
            status: 'IN_PROGRESS',
          },
        ]),
      },
      project: {
        findUnique: jest.fn().mockResolvedValue({ status: 'IN_PROGRESS' }),
      },
      deliverable: {
        count: jest.fn().mockResolvedValue(1),
      },
      payment: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          { milestoneId: 'deposit-1', status: 'COMPLETED', paymentRequestedAt: new Date() },
          { milestoneId: 'ms-1', status: 'PENDING', paymentRequestedAt: null },
        ]),
      },
    };
    mockPrismaWrite = {
      milestone: {
        create: jest.fn().mockResolvedValue({
          id: 'ms-new',
          projectId: 'proj-1',
          name: 'Dev',
          status: 'PENDING',
          order: 3,
        }),
        update: jest.fn().mockResolvedValue({ id: 'ms-1', name: 'Updated Design' }),
      },
      $transaction: jest.fn().mockImplementation(async (fn) => {
        const tx = {
          milestone: {
            update: jest.fn().mockResolvedValue({
              id: 'ms-1',
              projectId: 'proj-1',
              status: 'COMPLETED',
              name: 'Design',
              completedAt: new Date(),
            }),
          },
          outbox: { create: jest.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      }),
    };
    mockOutbox = { create: jest.fn() };
    service = new MilestonesService(
      mockPrismaWrite,
      mockPrismaRead,
      mockOutbox,
      new ConfigService(),
    );
  });

  describe('create', () => {
    it('should create a milestone with auto-order', async () => {
      const result = await service.create('proj-1', {
        name: 'Dev',
        description: 'Development phase',
        startDate: '2025-01-01',
        endDate: '2025-03-01',
      } as any);
      expect(result.id).toBe('ms-new');
      expect(result.order).toBe(3);
    });

    it('should use provided order', async () => {
      await service.create('proj-1', {
        name: 'Dev',
        description: 'Test',
        startDate: '2025-01-01',
        endDate: '2025-03-01',
        order: 1,
      } as any);
      expect(mockPrismaWrite.milestone.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ order: 1 }) }),
      );
    });
  });

  describe('update', () => {
    it('should update milestone fields', async () => {
      const result = await service.update('ms-1', { name: 'Updated Design' } as any);
      expect(result.name).toBe('Updated Design');
    });
  });

  describe('complete', () => {
    it('should mark milestone as completed with outbox event', async () => {
      const result = await service.complete('ms-1');
      expect(result.status).toBe('COMPLETED');
      expect(mockPrismaWrite.$transaction).toHaveBeenCalled();
    });

    it('should throw for non-existent milestone', async () => {
      mockPrismaRead.milestone.findUnique.mockResolvedValue(null);
      await expect(service.complete('invalid')).rejects.toThrow();
    });

    it('should reject complete when the work milestone has no submitted deliverables', async () => {
      mockPrismaRead.deliverable.count.mockResolvedValue(0);
      await expect(service.complete('ms-1')).rejects.toThrow(/deliverable/i);
    });

    it('should reject complete on deposit milestones', async () => {
      mockPrismaRead.milestone.findUnique.mockResolvedValue({
        id: 'deposit-1',
        projectId: 'proj-1',
        status: 'IN_PROGRESS',
        name: 'Deposit',
      });
      await expect(service.complete('deposit-1')).rejects.toThrow(/pay-only/i);
    });

    it('should auto-promote PENDING to COMPLETED via valid transitions', async () => {
      mockPrismaRead.milestone.findUnique.mockResolvedValue({
        id: 'ms-1',
        projectId: 'proj-1',
        status: 'PENDING',
        name: 'Design',
      });
      const result = await service.complete('ms-1');
      expect(result.status).toBe('COMPLETED');
    });
  });
});
