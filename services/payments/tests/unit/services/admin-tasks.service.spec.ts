import { Test, TestingModule } from '@nestjs/testing';
import { PaymentDisputesService } from '../../../src/services/payment-disputes.service';
import { PaymentReconciliationService } from '../../../src/services/payment-reconciliation.service';
import { PaymentConfirmationService } from '../../../src/services/payment-confirmation.service';
import { PaymentStatsService } from '../../../src/services/payment-stats.service';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { RazorpayService } from '../../../src/services/razorpay.service';
import { RefundService } from '../../../src/services/refund.service';
import { NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '@nestlancer/common';

describe('AdminTasksService', () => {
  let prismaWrite: jest.Mocked<PrismaWriteService>;
  let prismaRead: jest.Mocked<PrismaReadService>;
  let razorpayService: jest.Mocked<RazorpayService>;
  let refundService: jest.Mocked<RefundService>;

  beforeEach(() => {
    prismaWrite = {
      payment: { update: jest.fn() },
      outbox: { create: jest.fn() },
      $transaction: jest.fn(),
    } as any;
    prismaRead = {
      payment: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        aggregate: jest.fn(),
      },
      dispute: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    } as any;
    razorpayService = {
      fetchPayment: jest.fn(),
    } as any;
    refundService = {
      processRefund: jest.fn(),
    } as any;
  });

  describe('PaymentDisputesService', () => {
    let service: PaymentDisputesService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PaymentDisputesService,
          { provide: PrismaWriteService, useValue: prismaWrite },
          { provide: PrismaReadService, useValue: prismaRead },
          { provide: RazorpayService, useValue: razorpayService },
          { provide: RefundService, useValue: refundService },
        ],
      }).compile();
      service = module.get<PaymentDisputesService>(PaymentDisputesService);
    });

    describe('getDisputes', () => {
      it('should return paginated disputes from Dispute table', async () => {
        prismaRead.dispute.findMany = jest.fn().mockResolvedValue([
          {
            id: 'disp-1',
            paymentId: 'pay-1',
            amount: 100,
            currency: 'INR',
            status: 'OPEN',
            reason: null,
            externalId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            payment: {
              id: 'pay-1',
              amount: 100,
              currency: 'INR',
              status: 'DISPUTED',
              client: { id: 'c1', email: 'a@b.com' },
              project: { id: 'p1', title: 'Proj' },
            },
          },
        ] as any);
        prismaRead.dispute.count = jest.fn().mockResolvedValue(1);

        const result = await service.getDisputes({ page: 1, limit: '50' as any });

        expect(prismaRead.dispute.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 0,
            take: 50,
            orderBy: { updatedAt: 'desc' },
          }),
        );
        expect(result.items).toHaveLength(1);
        expect(result.items[0].id).toBe('disp-1');
        expect(result.meta.limit).toBe(50);
      });
    });

    describe('resolveDispute', () => {
      it('should throw NotFoundException if payment not found', async () => {
        prismaRead.payment.findUnique.mockResolvedValue(null);
        await expect(service.resolveDispute('1', { action: 'accept' })).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should resolve dispute and create outbox event', async () => {
        prismaRead.payment.findUnique.mockResolvedValue({
          id: '1',
          clientId: 'client-1',
          projectId: 'proj-1',
          amount: 10000,
          status: PaymentStatus.COMPLETED,
          providerDetails: {},
          project: { id: 'proj-1', status: 'DISPUTED' },
        } as any);

        const txPayment = { update: jest.fn().mockResolvedValue({}) };
        const txProject = { update: jest.fn().mockResolvedValue({}) };
        const txOutbox = { create: jest.fn().mockResolvedValue({}) };
        const txDispute = { updateMany: jest.fn().mockResolvedValue({ count: 1 }) };
        prismaWrite.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
          cb({ payment: txPayment, project: txProject, outbox: txOutbox, dispute: txDispute }),
        );

        const result = await service.resolveDispute('1', { action: 'accept', notes: 'agreed' });

        expect(txDispute.updateMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { paymentId: '1', status: 'OPEN' },
            data: expect.objectContaining({ status: 'RESOLVED' }),
          }),
        );
        expect(txProject.update).toHaveBeenCalledWith({
          where: { id: 'proj-1' },
          data: { status: 'CANCELLED' },
        });
        expect(txOutbox.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ type: 'PAYMENT_DISPUTE_RESOLVED' }),
          }),
        );
        expect(txOutbox.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ type: 'PROJECT_STATUS_CHANGED' }),
          }),
        );
        expect(result.newStatus).toBe('DISPUTE_LOST');
      });

      it('restores project to IN_PROGRESS on contest resolution', async () => {
        prismaRead.payment.findUnique.mockResolvedValue({
          id: '2',
          clientId: 'client-1',
          projectId: 'proj-2',
          amount: 5000,
          status: PaymentStatus.COMPLETED,
          providerDetails: {},
          project: { id: 'proj-2', status: 'DISPUTED' },
        } as any);

        const txPayment = { update: jest.fn().mockResolvedValue({}) };
        const txProject = { update: jest.fn().mockResolvedValue({}) };
        const txOutbox = { create: jest.fn().mockResolvedValue({}) };
        const txDispute = { updateMany: jest.fn().mockResolvedValue({ count: 1 }) };
        prismaWrite.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
          cb({ payment: txPayment, project: txProject, outbox: txOutbox, dispute: txDispute }),
        );

        const result = await service.resolveDispute('2', {
          action: 'contest',
          resolutionType: 'NO_REFUND',
        });

        expect(txProject.update).toHaveBeenCalledWith({
          where: { id: 'proj-2' },
          data: { status: 'IN_PROGRESS' },
        });
        expect(result.projectStatus).toBe('IN_PROGRESS');
      });

      it('throws when refund processing fails', async () => {
        prismaRead.payment.findUnique.mockResolvedValue({
          id: '3',
          clientId: 'client-1',
          projectId: 'proj-3',
          amount: 10000,
          status: PaymentStatus.COMPLETED,
          providerDetails: {},
          project: { id: 'proj-3', status: 'DISPUTED' },
        } as any);

        refundService.processRefund.mockRejectedValue(new Error('Razorpay unavailable'));

        await expect(
          service.resolveDispute('3', { action: 'accept', resolutionType: 'FULL_REFUND' }),
        ).rejects.toThrow('Refund could not be processed');
      });

      it('resolves dispute when id is dispute id (lookup paymentId)', async () => {
        prismaRead.dispute.findUnique.mockResolvedValue({ paymentId: 'pay-via-dispute' } as any);
        prismaRead.payment.findUnique.mockResolvedValue({
          id: 'pay-via-dispute',
          clientId: 'client-1',
          projectId: 'proj-d',
          amount: 8000,
          status: PaymentStatus.COMPLETED,
          providerDetails: {},
          project: { id: 'proj-d', status: 'DISPUTED' },
        } as any);

        const txPayment = { update: jest.fn().mockResolvedValue({}) };
        const txProject = { update: jest.fn().mockResolvedValue({}) };
        const txOutbox = { create: jest.fn().mockResolvedValue({}) };
        const txDispute = { updateMany: jest.fn().mockResolvedValue({ count: 1 }) };
        prismaWrite.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
          cb({ payment: txPayment, project: txProject, outbox: txOutbox, dispute: txDispute }),
        );

        await service.resolveDispute('disp-resolve-1', {
          action: 'contest',
          resolutionType: 'NO_REFUND',
        });

        expect(prismaRead.payment.findUnique).toHaveBeenCalledWith(
          expect.objectContaining({ where: { id: 'pay-via-dispute' } }),
        );
        expect(txDispute.updateMany).toHaveBeenCalledWith(
          expect.objectContaining({ where: { paymentId: 'pay-via-dispute', status: 'OPEN' } }),
        );
      });
    });

    describe('respondToDispute', () => {
      it('should move OPEN dispute to UNDER_REVIEW', async () => {
        (prismaRead as any).dispute = { findUnique: jest.fn() };
        (prismaWrite as any).dispute = { update: jest.fn() };

        (prismaRead as any).dispute.findUnique.mockResolvedValue({
          id: 'disp-1',
          paymentId: 'pay-1',
          status: 'OPEN',
          evidence: {},
        });
        (prismaWrite as any).dispute.update.mockResolvedValue({
          id: 'disp-1',
          paymentId: 'pay-1',
          status: 'UNDER_REVIEW',
          updatedAt: new Date(),
        });

        const result = await service.respondToDispute('disp-1', {
          notes: 'Reviewing evidence',
          evidence: { fileId: 'doc-1' },
        });

        expect((prismaWrite as any).dispute.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'disp-1' },
            data: expect.objectContaining({ status: 'UNDER_REVIEW' }),
          }),
        );
        expect(result.status).toBe('UNDER_REVIEW');
      });
    });
  });

  describe('PaymentReconciliationService', () => {
    let service: PaymentReconciliationService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PaymentReconciliationService,
          { provide: PrismaWriteService, useValue: prismaWrite },
          { provide: PrismaReadService, useValue: prismaRead },
          { provide: RazorpayService, useValue: razorpayService },
          { provide: PaymentConfirmationService, useValue: { confirmFromWebhook: jest.fn() } },
        ],
      }).compile();
      service = module.get<PaymentReconciliationService>(PaymentReconciliationService);
    });

    describe('reconcilePayments', () => {
      it('should return 0 reconciled if no payments', async () => {
        prismaRead.payment.findMany.mockResolvedValue([]);
        const result = await service.reconcilePayments({});
        expect(result).toEqual({ totalChecked: 0, reconciled: 0, mismatches: [] });
      });

      it('should identify mismatches and reconcile matched payments', async () => {
        prismaRead.payment.findMany.mockResolvedValue([
          {
            id: '1',
            externalId: 'ext1',
            amount: 100,
            status: PaymentStatus.COMPLETED,
            externalStatus: 'captured',
          },
          {
            id: '2',
            externalId: 'ext2',
            amount: 200,
            status: PaymentStatus.PROCESSING,
            externalStatus: 'authorized',
          },
        ] as any);

        // First payment matches
        razorpayService.fetchPayment.mockResolvedValueOnce({
          status: 'captured',
          amount: 100,
        } as any);
        // Second payment has amount mismatch (both sides are paise)
        razorpayService.fetchPayment.mockResolvedValueOnce({
          status: 'authorized',
          amount: 150,
        } as any);

        const result = await service.reconcilePayments({});

        expect(result.totalChecked).toBe(2);
        expect(result.reconciled).toBe(1);
        expect(result.mismatches).toHaveLength(1);
        expect(result.mismatches[0]).toEqual({
          paymentId: '2',
          localStatus: PaymentStatus.PROCESSING,
          providerStatus: 'authorized',
          localAmount: 200,
          providerAmount: 150,
          discrepancy: 'amount',
        });
      });
    });
  });

  describe('PaymentStatsService', () => {
    let service: PaymentStatsService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [PaymentStatsService, { provide: PrismaReadService, useValue: prismaRead }],
      }).compile();
      service = module.get<PaymentStatsService>(PaymentStatsService);
    });

    describe('getStats', () => {
      it('should return aggregated stats', async () => {
        prismaRead.payment.aggregate
          .mockResolvedValueOnce({ _sum: { amount: 1000 }, _count: { id: 10 } } as any) // total
          .mockResolvedValueOnce({ _sum: { amount: 800 }, _count: { id: 8 } } as any) // completed
          .mockResolvedValueOnce({ _sum: { amount: 200 }, _count: { id: 2 } } as any) // pending
          .mockResolvedValueOnce({ _sum: { amountRefunded: 0 }, _count: { id: 0 } } as any); // refunded
        prismaRead.payment.findMany.mockResolvedValue([
          { id: '1', client: {}, project: {} },
        ] as any); // recent

        const result = await service.getStats();

        expect(result.totalRevenue).toBe(800);
        expect(result.totalTransactions).toBe(10);
        expect(result.recentTransactions).toHaveLength(1);
      });
    });
  });
});
