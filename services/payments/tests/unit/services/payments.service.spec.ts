import { PaymentsService } from '../../../src/services/payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let mockPrismaWrite: any;
  let mockPrismaRead: any;

  beforeEach(() => {
    mockPrismaRead = {
      payment: {
        findMany: jest.fn().mockResolvedValue([{ id: 'pay-1', amount: 5000, status: 'COMPLETED', projectId: 'proj-1', milestoneId: null }]),
        count: jest.fn().mockResolvedValue(1),
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'pay-1', amount: 5000, clientId: 'user-1', refunds: [] }),
      },
      milestone: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    mockPrismaWrite = {};
    service = new PaymentsService(mockPrismaWrite, mockPrismaRead);
  });

  describe('getMyPayments', () => {
    it('should return paginated user payments', async () => {
      const result = await service.getMyPayments('user-1', { page: 1, limit: 20 } as any);
      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by status', async () => {
      await service.getMyPayments('user-1', { page: 1, limit: 20, status: 'COMPLETED' } as any);
      expect(mockPrismaRead.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'COMPLETED' }) }),
      );
    });
  });

  describe('getPaymentById', () => {
    it('should return payment with refunds', async () => {
      const result = await service.getPaymentById('user-1', 'pay-1');
      expect(result.id).toBe('pay-1');
    });

    it('should throw for non-existent payment', async () => {
      mockPrismaRead.payment.findFirst.mockResolvedValue(null);
      await expect(service.getPaymentById('user-1', 'invalid')).rejects.toThrow();
    });
  });

  describe('getAdminPayments', () => {
    it('should return all payments for admin', async () => {
      const result = await service.getAdminPayments({ page: 1, limit: 20 } as any);
      expect(result.items).toHaveLength(1);
    });

    it('should filter by clientId and projectId', async () => {
      await service.getAdminPayments({
        page: 1,
        limit: 20,
        clientId: 'user-1',
        projectId: 'proj-1',
      } as any);
      expect(mockPrismaRead.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clientId: 'user-1', projectId: 'proj-1' },
        }),
      );
    });
  });
});
