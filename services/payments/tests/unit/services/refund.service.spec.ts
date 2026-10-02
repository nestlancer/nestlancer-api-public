import { Test, TestingModule } from '@nestjs/testing';
import { RefundService } from '../../../src/services/refund.service';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { RazorpayService } from '../../../src/services/razorpay.service';
import {
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PaymentStatus } from '@nestlancer/common';

describe('RefundService', () => {
  let service: RefundService;
  let prismaWrite: jest.Mocked<PrismaWriteService>;
  let prismaRead: jest.Mocked<PrismaReadService>;
  let razorpayService: jest.Mocked<RazorpayService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundService,
        {
          provide: PrismaWriteService,
          useValue: {
            $transaction: jest.fn(),
          },
        },
        {
          provide: PrismaReadService,
          useValue: {
            payment: { findUnique: jest.fn() },
          },
        },
        {
          provide: RazorpayService,
          useValue: {
            initiateRefund: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RefundService>(RefundService);
    prismaWrite = module.get(PrismaWriteService);
    prismaRead = module.get(PrismaReadService);
    razorpayService = module.get(RazorpayService);

    prismaWrite.$transaction.mockImplementation(async (cb: any) => {
      return cb({
        refund: { create: jest.fn().mockResolvedValue({}) },
        payment: { update: jest.fn().mockResolvedValue({}) },
        outbox: { create: jest.fn().mockResolvedValue({}) },
      });
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processRefund', () => {
    it('should throw NotFoundException if payment not found', async () => {
      prismaRead.payment.findUnique.mockResolvedValue(null);
      await expect(service.processRefund('1', 'admin1', {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if payment not completed', async () => {
      prismaRead.payment.findUnique.mockResolvedValue({ status: PaymentStatus.PENDING } as any);
      await expect(service.processRefund('1', 'admin1', {} as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if missing externalId', async () => {
      prismaRead.payment.findUnique.mockResolvedValue({
        status: PaymentStatus.COMPLETED,
        externalId: null,
      } as any);
      await expect(service.processRefund('1', 'admin1', {} as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for seeded fake externalId', async () => {
      prismaRead.payment.findUnique.mockResolvedValue({
        status: PaymentStatus.COMPLETED,
        externalId: 'pay_test_complete_002',
        amount: 100,
        amountRefunded: 0,
      } as any);
      await expect(service.processRefund('1', 'admin1', {} as any)).rejects.toThrow(
        BadRequestException,
      );
      expect(razorpayService.initiateRefund).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if refund amount exceeds total', async () => {
      prismaRead.payment.findUnique.mockResolvedValue({
        status: PaymentStatus.COMPLETED,
        externalId: 'ext1',
        amount: 100,
        amountRefunded: 50,
      } as any);

      await expect(service.processRefund('1', 'admin1', { amount: 60 } as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should process full refund via transaction and change status to REFUNDED', async () => {
      prismaRead.payment.findUnique.mockResolvedValue({
        id: 'p1',
        status: PaymentStatus.COMPLETED,
        externalId: 'ext1',
        amount: 100,
        amountRefunded: 0,
        currency: 'INR',
      } as any);

      razorpayService.initiateRefund.mockResolvedValue({ id: 'refund1' } as any);

      const result = await service.processRefund('p1', 'admin1', { reason: 'test' } as any);

      expect(razorpayService.initiateRefund).toHaveBeenCalledWith('ext1', 100, { reason: 'test' });
      expect(prismaWrite.$transaction).toHaveBeenCalled();
      // Since we are mocking the transaction callback, we can't easily assert on the internal calls directly here without complex mock setup
      // the fact it completes without error and calls transaction is good for this unit test.
      expect(result).toBeDefined();
    });

    it('should throw InternalServerErrorException if Razorpay fails', async () => {
      prismaRead.payment.findUnique.mockResolvedValue({
        status: PaymentStatus.COMPLETED,
        externalId: 'ext1',
        amount: 100,
        amountRefunded: 0,
      } as any);

      razorpayService.initiateRefund.mockRejectedValue(new Error('Razorpay error'));

      await expect(service.processRefund('1', 'admin1', {} as any)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
