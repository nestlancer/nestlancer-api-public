import { PaymentIntentService } from '../../../src/services/payment-intent.service';

describe('PaymentIntentService', () => {
  let service: PaymentIntentService;
  let mockPrismaWrite: any;
  let mockRazorpayService: any;
  let mockPaymentGating: any;

  beforeEach(() => {
    mockPrismaWrite = {
      milestone: {
        findFirst: jest.fn().mockResolvedValue({ amount: 5000 }),
      },
      payment: {
        findFirst: jest.fn().mockImplementation((args: { where?: { status?: unknown } }) => {
          const status = args?.where?.status;
          if (status === 'PENDING_VERIFICATION') return Promise.resolve(null);
          return Promise.resolve(null);
        }),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({
          id: 'pay-1',
          projectId: 'proj-1',
          amount: 5000,
          currency: 'INR',
          status: 'CREATED',
        }),
        update: jest.fn().mockResolvedValue({
          id: 'pay-1',
          intentId: 'order_123',
          status: 'PENDING',
          projectId: 'proj-1',
          amount: 5000,
          currency: 'INR',
        }),
      },
    };
    mockRazorpayService = {
      createOrder: jest
        .fn()
        .mockResolvedValue({ id: 'order_123', amount: 500000, currency: 'INR' }),
      fetchOrder: jest.fn().mockResolvedValue({ id: 'order_old', status: 'created' }),
    };
    mockPaymentGating = {
      assertCanCreateIntent: jest.fn().mockResolvedValue(undefined),
    };
    service = new PaymentIntentService(mockPrismaWrite, mockRazorpayService, mockPaymentGating);
  });

  describe('createIntent', () => {
    const dto = { projectId: 'proj-1', milestoneId: 'ms-1', amount: 5000, currency: 'INR' };

    it('should create payment intent successfully', async () => {
      const result = await service.createIntent('user-1', dto as any);
      expect(result.id).toBe('pay-1');
      expect(result.clientSecret).toBe('order_123');
      expect(result.intentId).toBe('order_123');
      expect(result.amount).toBe(5000);
      expect(mockRazorpayService.createOrder).toHaveBeenCalledWith(5000, 'INR', 'pay-1');
    });

    it('should throw when Razorpay fails', async () => {
      mockRazorpayService.createOrder.mockResolvedValue(null);
      await expect(service.createIntent('user-1', dto as any)).rejects.toThrow();
      expect(mockPrismaWrite.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'FAILED' } }),
      );
    });

    it('reuses a pending payment when the Razorpay order is still created', async () => {
      mockPrismaWrite.payment.findFirst.mockImplementation((args: { where?: { status?: string } }) => {
        if (args?.where?.status === 'PENDING_VERIFICATION') return Promise.resolve(null);
        return Promise.resolve({
          id: 'pay-1',
          projectId: 'proj-1',
          amount: 5000,
          currency: 'INR',
          status: 'PENDING',
          intentId: 'order_open',
        });
      });
      mockRazorpayService.fetchOrder.mockResolvedValue({
        id: 'order_open',
        status: 'created',
        amount: 5000,
      });

      const result = await service.createIntent('user-1', dto as any);

      expect(result.clientSecret).toBe('order_open');
      expect(mockRazorpayService.createOrder).not.toHaveBeenCalled();
    });

    it('mints a fresh Razorpay order when the previous order was attempted', async () => {
      mockPrismaWrite.payment.findFirst.mockImplementation((args: { where?: { status?: string } }) => {
        if (args?.where?.status === 'PENDING_VERIFICATION') return Promise.resolve(null);
        return Promise.resolve({
          id: 'pay-1',
          projectId: 'proj-1',
          amount: 5000,
          currency: 'INR',
          status: 'PENDING',
          intentId: 'order_stale',
        });
      });
      mockRazorpayService.fetchOrder.mockResolvedValue({ id: 'order_stale', status: 'attempted' });
      mockRazorpayService.createOrder.mockResolvedValue({ id: 'order_fresh' });
      mockPrismaWrite.payment.update.mockResolvedValue({
        id: 'pay-1',
        intentId: 'order_fresh',
        status: 'PENDING',
        projectId: 'proj-1',
        amount: 5000,
        currency: 'INR',
      });

      const result = await service.createIntent('user-1', dto as any);

      expect(mockRazorpayService.createOrder).toHaveBeenCalled();
      expect(result.clientSecret).toBe('order_fresh');
    });
  });
});
