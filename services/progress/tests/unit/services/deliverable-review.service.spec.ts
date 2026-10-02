import { DeliverableReviewService } from '../../../src/services/deliverable-review.service';

describe('DeliverableReviewService', () => {
  let service: DeliverableReviewService;
  let mockPrismaWrite: any;
  let mockPrismaRead: any;
  let mockMilestoneApproval: { advanceIfDeliverablesClosed: jest.Mock };

  beforeEach(() => {
    mockPrismaRead = {
      deliverable: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'd1',
          status: 'PENDING',
          milestone: { id: 'ms-1', projectId: 'proj-1', status: 'COMPLETED' },
        }),
      },
      project: {
        findFirst: jest.fn().mockResolvedValue({ id: 'proj-1' }),
      },
    };
    mockPrismaWrite = {
      deliverable: {
        update: jest
          .fn()
          .mockResolvedValue({ id: 'd1', status: 'APPROVED', approvedAt: new Date() }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue({ id: 'd1', status: 'APPROVED', approvedAt: new Date() }),
      },
      progressEntry: { create: jest.fn().mockResolvedValue({}) },
      outbox: { create: jest.fn().mockResolvedValue({}) },
    };
    mockMilestoneApproval = {
      advanceIfDeliverablesClosed: jest.fn().mockResolvedValue(true),
    };
    service = new DeliverableReviewService(
      mockPrismaWrite,
      mockPrismaRead,
      mockMilestoneApproval as any,
    );
  });

  describe('approve', () => {
    it('should approve a pending deliverable', async () => {
      const result = await service.approve('d1', 'user-1', {
        feedback: 'Good work',
        rating: 5,
      } as any);
      expect(result.status).toBe('APPROVED');
      expect(mockPrismaWrite.deliverable.updateMany).toHaveBeenCalledWith({
        where: { id: 'd1', status: { not: 'APPROVED' } },
        data: expect.objectContaining({ status: 'APPROVED' }),
      });
      expect(mockMilestoneApproval.advanceIfDeliverablesClosed).toHaveBeenCalled();
    });

    it('should throw for non-existent deliverable', async () => {
      mockPrismaRead.deliverable.findUnique.mockResolvedValue(null);
      await expect(service.approve('invalid', 'user-1', {} as any)).rejects.toThrow();
    });

    it('should throw for already approved deliverable', async () => {
      mockPrismaRead.deliverable.findUnique.mockResolvedValue({ id: 'd1', status: 'APPROVED' });
      await expect(service.approve('d1', 'user-1', {} as any)).rejects.toThrow();
    });

    it('should throw when concurrent claim loses the race', async () => {
      mockPrismaWrite.deliverable.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.approve('d1', 'user-1', {} as any)).rejects.toThrow(
        /already approved/i,
      );
    });
  });

  describe('reject', () => {
    it('should reject a deliverable', async () => {
      mockPrismaWrite.deliverable.update.mockResolvedValue({ id: 'd1', status: 'REJECTED' });
      const result = await service.reject('d1', 'user-1', { reason: 'Quality issues' } as any);
      expect(result.status).toBe('REJECTED');
    });

    it('should throw for non-existent deliverable', async () => {
      mockPrismaRead.deliverable.findUnique.mockResolvedValue(null);
      await expect(service.reject('invalid', 'user-1', {} as any)).rejects.toThrow();
    });
  });
});
