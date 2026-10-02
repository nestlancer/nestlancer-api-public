import { Test, TestingModule } from '@nestjs/testing';
import { DisputeCreatedHandler } from '../../../../src/handlers/razorpay/dispute-created.handler';
import { PrismaWriteService } from '@nestlancer/database';
import { LoggerService } from '@nestlancer/logger';

describe('DisputeCreatedHandler', () => {
  let handler: DisputeCreatedHandler;
  let prismaWrite: jest.Mocked<PrismaWriteService>;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputeCreatedHandler,
        {
          provide: PrismaWriteService,
          useValue: {
            payment: { findFirst: jest.fn(), update: jest.fn() },
            dispute: { create: jest.fn() },
            $transaction: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
        },
      ],
    }).compile();

    handler = module.get<DisputeCreatedHandler>(DisputeCreatedHandler);
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
    it('should return true for razorpay dispute.created events', () => {
      expect(handler.canHandle('razorpay', 'dispute.created')).toBe(true);
    });

    it('should return false for other providers', () => {
      expect(handler.canHandle('github', 'dispute.created')).toBe(false);
    });

    it('should return false for other event types', () => {
      expect(handler.canHandle('razorpay', 'payment.captured')).toBe(false);
    });
  });

  describe('handle', () => {
    const payload = {
      dispute: {
        entity: {
          id: 'disp_001',
          payment_id: 'pay_789',
          reason: 'fraudulent',
          amount: 10000,
          respond_by: 1700000000,
        },
      },
    };

    it('should return early if payment not found', async () => {
      prismaWrite.payment.findFirst.mockResolvedValue(null);

      await handler.handle(payload);

      expect(prismaWrite.$transaction).not.toHaveBeenCalled();
    });

    it('should update payment status to DISPUTED and create dispute record', async () => {
      const payment = { id: 'payment-5', externalId: 'pay_789', status: 'COMPLETED' };
      prismaWrite.payment.findFirst.mockResolvedValue(payment as any);
      prismaWrite.$transaction.mockResolvedValue([{}, {}] as any);

      await handler.handle(payload);

      expect(prismaWrite.$transaction).toHaveBeenCalledWith([
        prismaWrite.payment.update({
          where: { id: 'payment-5' },
          data: { status: 'DISPUTED' },
        }),
        prismaWrite.dispute.create({
          data: {
            externalId: 'disp_001',
            paymentId: 'payment-5',
            reason: 'fraudulent',
            amount: 100,
            status: 'OPEN',
            evidenceDueBy: new Date(1700000000 * 1000),
          },
        }),
      ]);

      expect(logger.warn).toHaveBeenCalledWith('Dispute created for payment: pay_789');
    });
  });
});
