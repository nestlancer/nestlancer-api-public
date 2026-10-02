import { Test, TestingModule } from '@nestjs/testing';
import { PaymentCapturedHandler } from '../../../../src/handlers/razorpay/payment-captured.handler';
import { PaymentCompletionService } from '@nestlancer/common';
import { PrismaWriteService } from '@nestlancer/database';
import { LoggerService } from '@nestlancer/logger';

describe('PaymentCapturedHandler', () => {
  let handler: PaymentCapturedHandler;
  let prismaWrite: jest.Mocked<PrismaWriteService>;
  let logger: jest.Mocked<LoggerService>;
  let paymentCompletion: jest.Mocked<PaymentCompletionService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentCapturedHandler,
        {
          provide: PrismaWriteService,
          useValue: {
            payment: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
          },
        },
        {
          provide: LoggerService,
          useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
        },
        {
          provide: PaymentCompletionService,
          useValue: { finalizeExistingPayment: jest.fn() },
        },
      ],
    }).compile();

    handler = module.get<PaymentCapturedHandler>(PaymentCapturedHandler);
    prismaWrite = module.get(PrismaWriteService);
    logger = module.get(LoggerService);
    paymentCompletion = module.get(PaymentCompletionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('canHandle', () => {
    it('should return true for razorpay payment.captured events', () => {
      expect(handler.canHandle('razorpay', 'payment.captured')).toBe(true);
    });

    it('should return false for other providers', () => {
      expect(handler.canHandle('github', 'payment.captured')).toBe(false);
    });

    it('should return false for other event types', () => {
      expect(handler.canHandle('razorpay', 'payment.failed')).toBe(false);
    });
  });

  describe('handle', () => {
    const payload = {
      payload: { payment: { entity: { id: 'pay_123', order_id: 'order_abc' } } },
    };

    it('should return early if payment not found', async () => {
      prismaWrite.payment.findFirst.mockResolvedValue(null);

      await handler.handle(payload);

      expect(logger.error).toHaveBeenCalledWith(
        'Payment not found for Razorpay ID pay_123 or order_id order_abc',
      );
      expect(prismaWrite.payment.update).not.toHaveBeenCalled();
    });

    it('should return early and warn if payment already COMPLETED', async () => {
      prismaWrite.payment.findFirst.mockResolvedValue({
        id: 'payment-1',
        status: 'COMPLETED',
        clientId: 'user-1',
        amount: 1000,
      } as any);

      await handler.handle(payload);

      expect(logger.warn).toHaveBeenCalledWith('Payment payment-1 already captured, skipping.');
      expect(prismaWrite.payment.update).not.toHaveBeenCalled();
    });

    it('should find payment by intentId when externalId is not set', async () => {
      const payment = {
        id: 'payment-1',
        status: 'PENDING',
        clientId: 'user-1',
        projectId: 'proj-1',
        milestoneId: 'ms-1',
        amount: 1000,
        currency: 'INR',
      };
      prismaWrite.payment.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(payment as any);
      prismaWrite.payment.findUnique.mockResolvedValue({
        ...payment,
        client: { email: 'a@b.com', firstName: 'A', lastName: 'B' },
        project: { title: 'Project' },
      } as any);
      prismaWrite.payment.update.mockResolvedValue({ ...payment, status: 'COMPLETED' } as any);
      paymentCompletion.finalizeExistingPayment.mockResolvedValue(undefined);

      await handler.handle(payload);

      expect(prismaWrite.payment.findFirst).toHaveBeenNthCalledWith(1, {
        where: { externalId: 'pay_123' },
      });
      expect(prismaWrite.payment.findFirst).toHaveBeenNthCalledWith(2, {
        where: { intentId: 'order_abc' },
      });
      expect(paymentCompletion.finalizeExistingPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentId: 'payment-1',
          projectId: 'proj-1',
          milestoneId: 'ms-1',
          source: 'razorpay_webhook',
        }),
      );
    });

    it('should update payment and run finalizeExistingPayment on success', async () => {
      const payment = {
        id: 'payment-1',
        status: 'PENDING',
        clientId: 'user-1',
        projectId: 'proj-1',
        milestoneId: null,
        amount: 1000,
        currency: 'INR',
      };
      prismaWrite.payment.findFirst.mockResolvedValue(payment as any);
      prismaWrite.payment.findUnique.mockResolvedValue({
        ...payment,
        client: { email: 'a@b.com', firstName: 'A', lastName: 'B' },
        project: { title: 'Project' },
      } as any);
      prismaWrite.payment.update.mockResolvedValue({ ...payment, status: 'COMPLETED' } as any);
      paymentCompletion.finalizeExistingPayment.mockResolvedValue(undefined);

      await handler.handle(payload);

      expect(logger.log).toHaveBeenCalledWith('Handling payment.captured for Razorpay ID: pay_123');
      expect(prismaWrite.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: {
          status: 'COMPLETED',
          externalId: 'pay_123',
          paidAt: expect.any(Date),
        },
      });
      expect(paymentCompletion.finalizeExistingPayment).toHaveBeenCalledWith({
        paymentId: 'payment-1',
        projectId: 'proj-1',
        milestoneId: null,
        amount: 1000,
        currency: 'INR',
        clientId: 'user-1',
        clientEmail: 'a@b.com',
        clientName: 'A B',
        projectTitle: 'Project',
        source: 'razorpay_webhook',
      });
    });
  });
});
