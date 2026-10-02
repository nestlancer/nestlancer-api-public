import { Test, TestingModule } from '@nestjs/testing';
import { PaymentFailedHandler } from '../../../../src/handlers/razorpay/payment-failed.handler';
import { PrismaWriteService } from '@nestlancer/database';
import { LoggerService } from '@nestlancer/logger';
import { QueuePublisherService } from '@nestlancer/queue';

describe('PaymentFailedHandler', () => {
  let handler: PaymentFailedHandler;
  let prismaWrite: jest.Mocked<PrismaWriteService>;
  let queue: jest.Mocked<QueuePublisherService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentFailedHandler,
        {
          provide: PrismaWriteService,
          useValue: {
            payment: { findFirst: jest.fn(), update: jest.fn() },
          },
        },
        {
          provide: LoggerService,
          useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
        },
        {
          provide: QueuePublisherService,
          useValue: { publish: jest.fn() },
        },
      ],
    }).compile();

    handler = module.get<PaymentFailedHandler>(PaymentFailedHandler);
    prismaWrite = module.get(PrismaWriteService);
    queue = module.get(QueuePublisherService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('canHandle', () => {
    it('should return true for razorpay payment.failed events', () => {
      expect(handler.canHandle('razorpay', 'payment.failed')).toBe(true);
    });

    it('should return false for other providers', () => {
      expect(handler.canHandle('github', 'payment.failed')).toBe(false);
    });

    it('should return false for other event types', () => {
      expect(handler.canHandle('razorpay', 'payment.captured')).toBe(false);
    });
  });

  describe('handle', () => {
    const payload = {
      payment: {
        entity: {
          id: 'pay_456',
          error_description: 'Insufficient funds',
        },
      },
    };

    it('should return early if payment not found', async () => {
      prismaWrite.payment.findFirst.mockResolvedValue(null);

      await handler.handle(payload);

      expect(prismaWrite.payment.update).not.toHaveBeenCalled();
      expect(queue.publish).not.toHaveBeenCalled();
    });

    it('should update payment status to FAILED and publish notification', async () => {
      const payment = {
        id: 'payment-2',
        status: 'PENDING',
        clientId: 'user-2',
        amount: 500,
      };
      prismaWrite.payment.findFirst.mockResolvedValue(payment as any);
      prismaWrite.payment.update.mockResolvedValue({} as any);
      queue.publish.mockResolvedValue(undefined);

      await handler.handle(payload);

      expect(prismaWrite.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-2' },
        data: { status: 'FAILED', failureReason: 'Insufficient funds' },
      });

      expect(queue.publish).toHaveBeenCalledWith('nestlancer.events', 'payment.payment.failed', {
        paymentId: 'payment-2',
        clientId: 'user-2',
        userId: 'user-2',
        reason: 'Insufficient funds',
      });
    });
  });
});
