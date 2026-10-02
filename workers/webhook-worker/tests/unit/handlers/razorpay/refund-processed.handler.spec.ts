import { Test, TestingModule } from '@nestjs/testing';
import { RefundProcessedHandler } from '../../../../src/handlers/razorpay/refund-processed.handler';
import { PrismaWriteService } from '@nestlancer/database';
import { LoggerService } from '@nestlancer/logger';

describe('RefundProcessedHandler', () => {
  let handler: RefundProcessedHandler;
  let prismaWrite: jest.Mocked<PrismaWriteService>;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundProcessedHandler,
        {
          provide: PrismaWriteService,
          useValue: {
            refund: { findFirst: jest.fn(), update: jest.fn().mockResolvedValue({}) },
            payment: { findUnique: jest.fn() },
            $transaction: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
        },
      ],
    }).compile();

    handler = module.get<RefundProcessedHandler>(RefundProcessedHandler);
    prismaWrite = module.get(PrismaWriteService);
    logger = module.get(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('canHandle', () => {
    it('should return true for razorpay refund.processed events', () => {
      expect(handler.canHandle('razorpay', 'refund.processed')).toBe(true);
    });

    it('should return false for other providers', () => {
      expect(handler.canHandle('github', 'refund.processed')).toBe(false);
    });

    it('should return false for other event types', () => {
      expect(handler.canHandle('razorpay', 'payment.captured')).toBe(false);
    });
  });

  describe('handle', () => {
    const payload = {
      refund: {
        entity: {
          id: 'rfnd_123',
          payment_id: 'pay_789',
        },
      },
    };

    it('should return early if refund not found', async () => {
      prismaWrite.refund.findFirst.mockResolvedValue(null);

      await handler.handle(payload);

      expect(prismaWrite.$transaction).not.toHaveBeenCalled();
    });

    it('should update refund status on success', async () => {
      const refund = { id: 'refund-1', paymentId: 'payment-3', amount: 250 };
      prismaWrite.refund.findFirst.mockResolvedValue(refund as any);

      await handler.handle(payload);

      expect(prismaWrite.refund.update).toHaveBeenCalledWith({
        where: { id: 'refund-1' },
        data: { status: 'PROCESSED', processedAt: expect.any(Date) },
      });
      expect(prismaWrite.$transaction).not.toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith('Processed refund for payment: pay_789');
    });
  });
});
