import { ProjectPaymentsService } from '../../../src/services/project-payments.service';
import { ProjectPaymentScheduleService } from '../../../src/services/project-payment-schedule.service';

describe('ProjectPaymentsService', () => {
  let service: ProjectPaymentsService;
  let mockPrismaRead: any;
  let mockPaymentSchedule: { backfillIfMissing: jest.Mock };

  beforeEach(() => {
    mockPaymentSchedule = { backfillIfMissing: jest.fn().mockResolvedValue(undefined) };
    mockPrismaRead = {
      project: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'proj-1',
          userId: 'user-1',
          quote: { totalAmount: 10000, currency: 'INR' },
        }),
      },
      payment: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'p1',
            amount: 10000,
            currency: 'INR',
            status: 'COMPLETED',
            milestoneId: 'm1',
            createdAt: new Date(),
            paidAt: new Date(),
            milestone: { name: 'Deposit' },
          },
        ]),
      },
    };
    service = new ProjectPaymentsService(
      mockPrismaRead,
      mockPaymentSchedule as unknown as ProjectPaymentScheduleService,
    );
  });

  describe('getPayments', () => {
    it('should return payment summary', async () => {
      const result = await service.getPayments('user-1', 'proj-1');
      expect(result.total).toBe(10000);
      expect(result.history).toBeDefined();
    });

    it('should throw for non-existent project', async () => {
      mockPrismaRead.project.findFirst.mockResolvedValue(null);
      await expect(service.getPayments('user-1', 'invalid')).rejects.toThrow();
    });

    it('should handle project without quote', async () => {
      mockPrismaRead.project.findFirst.mockResolvedValue({ id: 'proj-1', quote: null });
      mockPrismaRead.payment.findMany.mockResolvedValue([]);
      const result = await service.getPayments('user-1', 'proj-1');
      expect(result.total).toBe(0);
      expect(mockPaymentSchedule.backfillIfMissing).toHaveBeenCalledWith('proj-1', 'user-1');
    });
  });
});
