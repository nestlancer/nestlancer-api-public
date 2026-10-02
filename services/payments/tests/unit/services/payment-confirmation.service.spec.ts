import { Test, TestingModule } from '@nestjs/testing';
import { PaymentConfirmationService } from '../../../src/services/payment-confirmation.service';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';
import { RazorpayService } from '../../../src/services/razorpay.service';
import { PaymentGatingService } from '../../../src/services/payment-gating.service';
import { PaymentCompletionService } from '@nestlancer/common';
import { BadRequestException } from '@nestjs/common';
import { PaymentStatus } from '@nestlancer/common';

describe('PaymentConfirmationService', () => {
  let service: PaymentConfirmationService;
  let prismaRead: jest.Mocked<PrismaReadService>;
  let prismaWrite: jest.Mocked<PrismaWriteService>;
  let razorpayService: jest.Mocked<RazorpayService>;
  let paymentCompletion: jest.Mocked<PaymentCompletionService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentConfirmationService,
        {
          provide: PrismaReadService,
          useValue: {
            payment: { findUnique: jest.fn() },
          },
        },
        {
          provide: PrismaWriteService,
          useValue: {
            payment: { update: jest.fn(), updateMany: jest.fn() },
          },
        },
        {
          provide: RazorpayService,
          useValue: {
            verifyPaymentSignature: jest.fn(),
            fetchPayment: jest.fn().mockResolvedValue({ amount: 100, order_id: 'pi_1' }),
          },
        },
        {
          provide: PaymentGatingService,
          useValue: {
            assertCanCreateIntent: jest.fn(),
          },
        },
        {
          provide: PaymentCompletionService,
          useValue: {
            finalizeExistingPayment: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentConfirmationService>(PaymentConfirmationService);
    prismaRead = module.get(PrismaReadService);
    prismaWrite = module.get(PrismaWriteService);
    razorpayService = module.get(RazorpayService);
    paymentCompletion = module.get(PaymentCompletionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('confirm', () => {
    it('should throw BadRequestException if signature is invalid', async () => {
      razorpayService.verifyPaymentSignature.mockReturnValue(false);
      await expect(
        service.confirm('user1', {
          paymentIntentId: 'pi_1',
          externalPaymentId: 'pay_1',
          signature: 'sig_1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if payment not found', async () => {
      razorpayService.verifyPaymentSignature.mockReturnValue(true);
      prismaRead.payment.findUnique.mockResolvedValue(null);
      await expect(
        service.confirm('user1', {
          paymentIntentId: 'pi_1',
          externalPaymentId: 'pay_1',
          signature: 'sig_1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return early if payment already completed', async () => {
      razorpayService.verifyPaymentSignature.mockReturnValue(true);
      prismaRead.payment.findUnique.mockResolvedValue({
        id: 'p1',
        clientId: 'user1',
        status: PaymentStatus.COMPLETED,
      } as never);

      const result = await service.confirm('user1', {
        paymentIntentId: 'pi_1',
        externalPaymentId: 'pay_1',
        signature: 'sig_1',
      });

      expect(result.id).toBe('p1');
      expect(paymentCompletion.finalizeExistingPayment).not.toHaveBeenCalled();
    });

    it('should complete payment and delegate side-effects to PaymentCompletionService', async () => {
      razorpayService.verifyPaymentSignature.mockReturnValue(true);
      prismaRead.payment.findUnique
        .mockResolvedValueOnce({
          id: 'p1',
          clientId: 'user1',
          projectId: 'proj-1',
          milestoneId: 'ms-1',
          amount: 100,
          currency: 'INR',
          status: PaymentStatus.PENDING,
        } as never)
        .mockResolvedValueOnce({
          id: 'p1',
          clientId: 'user1',
          projectId: 'proj-1',
          milestoneId: 'ms-1',
          amount: 100,
          currency: 'INR',
          status: PaymentStatus.PENDING,
        } as never)
        .mockResolvedValueOnce({
          id: 'p1',
          client: { email: 'user@test.com', firstName: 'Test', lastName: 'User' },
          project: { title: 'Test project' },
        } as never)
        .mockResolvedValueOnce({
          id: 'p1',
          status: PaymentStatus.COMPLETED,
        } as never);

      prismaWrite.payment.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.confirm('user1', {
        paymentIntentId: 'pi_1',
        externalPaymentId: 'pay_1',
        signature: 'sig_1',
      });

      expect(prismaWrite.payment.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'p1',
          status: { in: [PaymentStatus.PENDING, PaymentStatus.CREATED, PaymentStatus.PROCESSING] },
        },
        data: expect.objectContaining({
          status: PaymentStatus.COMPLETED,
          externalId: 'pay_1',
        }),
      });
      expect(paymentCompletion.finalizeExistingPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentId: 'p1',
          projectId: 'proj-1',
          milestoneId: 'ms-1',
          clientId: 'user1',
          source: 'razorpay_confirm',
        }),
      );
      expect(result.id).toBe('p1');
    });
  });
});
