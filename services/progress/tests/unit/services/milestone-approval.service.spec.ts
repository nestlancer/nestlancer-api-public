import { MilestoneApprovalService } from '../../../src/services/milestone-approval.service';

describe('MilestoneApprovalService', () => {
  let service: MilestoneApprovalService;
  let mockPrismaWrite: any;
  let mockPrismaRead: any;
  let mockOutbox: any;

  beforeEach(() => {
    mockPrismaRead = {
      milestone: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'ms-1',
          projectId: 'proj-1',
          status: 'COMPLETED',
          name: 'Design',
        }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'deposit-1',
            name: 'Deposit',
            order: 1,
            createdAt: new Date('2026-01-01'),
            status: 'APPROVED',
          },
          {
            id: 'ms-1',
            name: 'Design',
            order: 2,
            createdAt: new Date('2026-01-02'),
            status: 'COMPLETED',
          },
        ]),
      },
      project: {
        findFirst: jest.fn().mockResolvedValue({ id: 'proj-1' }),
      },
      payment: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { milestoneId: 'deposit-1', status: 'COMPLETED', paymentRequestedAt: null },
          ]),
      },
    };
    mockPrismaWrite = {
      payment: { create: jest.fn() },
      $transaction: jest.fn().mockImplementation(async (fn) => {
        const tx = {
          milestone: {
            findMany: jest.fn().mockResolvedValue([
              { id: 'deposit-1', name: 'Deposit', order: 1, createdAt: new Date('2026-01-01') },
              { id: 'ms-1', name: 'Design', order: 2, createdAt: new Date('2026-01-02') },
            ]),
            update: jest.fn().mockResolvedValue({
              id: 'ms-1',
              projectId: 'proj-1',
              status: 'APPROVED',
              approvedAt: new Date(),
            }),
          },
          deliverable: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
          progressEntry: { create: jest.fn().mockResolvedValue({}) },
          outbox: { create: jest.fn().mockResolvedValue({}) },
          payment: {
            findMany: jest.fn().mockResolvedValue([{ milestoneId: 'deposit-1' }]),
            findFirst: jest.fn().mockResolvedValue(null),
            update: jest.fn(),
          },
          project: {
            findUnique: jest.fn().mockResolvedValue({ quote: { paymentTerms: null } }),
          },
        };
        return fn(tx);
      }),
    };
    mockOutbox = {};
    service = new MilestoneApprovalService(mockPrismaWrite, mockPrismaRead, mockOutbox);
  });

  describe('approve', () => {
    it('should approve a completed milestone', async () => {
      const result = await service.approve('ms-1', 'user-1', { feedback: 'Looks great' } as any);
      expect(result.status).toBe('APPROVED');
      expect(mockPrismaWrite.$transaction).toHaveBeenCalled();
    });

    it('should throw for non-existent milestone', async () => {
      mockPrismaRead.milestone.findUnique.mockResolvedValue(null);
      await expect(service.approve('invalid', 'user-1', {} as any)).rejects.toThrow();
    });

    it('should throw for non-COMPLETED milestone', async () => {
      mockPrismaRead.milestone.findUnique.mockResolvedValue({ id: 'ms-1', status: 'PENDING' });
      await expect(service.approve('ms-1', 'user-1', {} as any)).rejects.toThrow();
    });
  });

  describe('requestRevision', () => {
    const baseMilestone = {
      id: 'ms-1',
      projectId: 'proj-1',
      status: 'COMPLETED',
      name: 'Design',
      revisionCount: 0,
      project: {
        clientId: 'user-1',
        quote: { revisionsIncluded: 2, additionalRevisionCost: 5000 },
      },
    };

    beforeEach(() => {
      mockPrismaRead.milestone.findUnique.mockResolvedValue(baseMilestone);
    });

    it('should request revision on completed milestone', async () => {
      mockPrismaWrite.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          milestone: {
            update: jest
              .fn()
              .mockResolvedValue({ id: 'ms-1', projectId: 'proj-1', status: 'REVISION_REQUESTED' }),
          },
          progressEntry: { create: jest.fn().mockResolvedValue({}) },
          outbox: { create: jest.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });

      const result = await service.requestRevision('ms-1', 'user-1', {
        reason: 'Needs more work',
      } as any);
      expect(result.status).toBe('REVISION_REQUESTED');
    });

    it('should create overflow payment when revision limit exceeded', async () => {
      mockPrismaRead.milestone.findUnique.mockResolvedValue({
        ...baseMilestone,
        revisionCount: 2,
      });
      mockPrismaWrite.payment = {
        create: jest.fn().mockResolvedValue({ id: 'pay-overflow-1' }),
      };

      const result = await service.requestRevision('ms-1', 'user-1', {
        reason: 'Fourth round',
      } as any);

      expect(result.requiresAdditionalPayment).toBe(true);
      expect(result.paymentId).toBe('pay-overflow-1');
      expect(mockPrismaWrite.payment.create).toHaveBeenCalled();
    });

    it('should throw for non-COMPLETED milestone', async () => {
      mockPrismaRead.milestone.findUnique.mockResolvedValue({ id: 'ms-1', status: 'PENDING' });
      await expect(
        service.requestRevision('ms-1', 'user-1', { reason: 'test' } as any),
      ).rejects.toThrow();
    });
  });
});
