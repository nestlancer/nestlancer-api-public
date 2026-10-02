import { Test, TestingModule } from '@nestjs/testing';
import { PaymentMilestonesService } from '../../../src/services/payment-milestones.service';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';

describe('PaymentMilestonesService', () => {
  let service: PaymentMilestonesService;
  let prismaRead: jest.Mocked<PrismaReadService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentMilestonesService,
        {
          provide: PrismaReadService,
          useValue: {
            milestone: { findMany: jest.fn() },
            payment: { findMany: jest.fn() },
            project: { findMany: jest.fn() },
          },
        },
        {
          provide: PrismaWriteService,
          useValue: {
            deliverable: { findMany: jest.fn().mockResolvedValue([]) },
            milestone: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
          },
        },
      ],
    }).compile();

    service = module.get<PaymentMilestonesService>(PaymentMilestonesService);
    prismaRead = module.get(PrismaReadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listMilestones', () => {
    it('surfaces linked installment payment status on work milestones', async () => {
      prismaRead.milestone.findMany.mockResolvedValue([
        {
          id: 'deposit',
          projectId: 'proj-1',
          name: 'Deposit',
          amount: 1860000,
          percentage: 30,
          order: 1,
          status: 'APPROVED',
          createdAt: new Date('2026-01-01'),
          project: { id: 'proj-1', title: 'Batch Tracking' },
        },
        {
          id: 'work',
          projectId: 'proj-1',
          name: 'Batch Tracking MVP',
          amount: 6200000,
          percentage: null,
          order: 1,
          status: 'APPROVED',
          createdAt: new Date('2026-01-02'),
          project: { id: 'proj-1', title: 'Batch Tracking' },
        },
        {
          id: 'mid',
          projectId: 'proj-1',
          name: 'Mid-project payment',
          amount: 2480000,
          percentage: 40,
          order: 2,
          status: 'APPROVED',
          createdAt: new Date('2026-01-01'),
          project: { id: 'proj-1', title: 'Batch Tracking' },
        },
        {
          id: 'final',
          projectId: 'proj-1',
          name: 'Final payment',
          amount: 1860000,
          percentage: 30,
          order: 3,
          status: 'APPROVED',
          createdAt: new Date('2026-01-01'),
          project: { id: 'proj-1', title: 'Batch Tracking' },
        },
      ] as any);

      prismaRead.project.findMany.mockResolvedValue([
        {
          id: 'proj-1',
          quote: {
            paymentSchedule: [
              { label: 'Deposit', percentage: 30, amountPaise: 1860000, dueTrigger: 'on_accept' },
              {
                label: 'Mid-project payment',
                percentage: 40,
                amountPaise: 2480000,
                dueTrigger: 'on_prior_approved',
              },
              {
                label: 'Final payment',
                percentage: 30,
                amountPaise: 1860000,
                dueTrigger: 'on_prior_approved',
              },
            ],
          },
        },
      ] as any);

      prismaRead.payment.findMany.mockResolvedValue([
        {
          id: 'pay-deposit',
          milestoneId: 'deposit',
          projectId: 'proj-1',
          amount: 1860000,
          status: 'COMPLETED',
          paymentRequestedAt: null,
          createdAt: new Date('2026-01-03'),
        },
        {
          id: 'pay-mid',
          milestoneId: 'mid',
          projectId: 'proj-1',
          amount: 2480000,
          status: 'COMPLETED',
          paymentRequestedAt: new Date('2026-01-04'),
          createdAt: new Date('2026-01-05'),
        },
        {
          id: 'pay-final',
          milestoneId: 'final',
          projectId: 'proj-1',
          amount: 1860000,
          status: 'COMPLETED',
          paymentRequestedAt: new Date('2026-01-06'),
          createdAt: new Date('2026-01-07'),
        },
      ] as any);

      const rows = await service.listMilestones('proj-1');
      const work = rows.find((r) => r.id === 'work');

      expect(work?.latestStatus).toBe('COMPLETED');
      expect(work?.linkedInstallmentId).toBe('mid');
      expect(work?.linkedInstallmentName).toBe('Mid-project payment');
      expect(work?.linkedInstallmentInclusive).toBe(false);
      expect(work?.billableAmount).toBe(2480000);
      expect(work?.latestPaymentId).toBe('pay-mid');
    });

    it('marks trailing work as included in the last installment', async () => {
      prismaRead.milestone.findMany.mockResolvedValue([
        {
          id: 'deposit',
          projectId: 'proj-1',
          name: 'Deposit',
          amount: 2250000,
          percentage: 30,
          order: 1,
          status: 'APPROVED',
          createdAt: new Date('2026-01-01'),
          project: { id: 'proj-1', title: 'Khandesh' },
        },
        {
          id: 'w1',
          projectId: 'proj-1',
          name: 'Design & Architecture',
          amount: 2250000,
          percentage: null,
          order: 1,
          status: 'APPROVED',
          createdAt: new Date('2026-01-02'),
          project: { id: 'proj-1', title: 'Khandesh' },
        },
        {
          id: 'mid',
          projectId: 'proj-1',
          name: 'Mid-project payment',
          amount: 3000000,
          percentage: 40,
          order: 2,
          status: 'PENDING',
          createdAt: new Date('2026-01-01'),
          project: { id: 'proj-1', title: 'Khandesh' },
        },
        {
          id: 'w2',
          projectId: 'proj-1',
          name: 'Storefront & Checkout',
          amount: 3750000,
          percentage: null,
          order: 2,
          status: 'PENDING',
          createdAt: new Date('2026-01-03'),
          project: { id: 'proj-1', title: 'Khandesh' },
        },
        {
          id: 'final',
          projectId: 'proj-1',
          name: 'Final payment',
          amount: 2250000,
          percentage: 30,
          order: 3,
          status: 'PENDING',
          createdAt: new Date('2026-01-01'),
          project: { id: 'proj-1', title: 'Khandesh' },
        },
        {
          id: 'w3',
          projectId: 'proj-1',
          name: 'QA, SEO & Launch',
          amount: 1500000,
          percentage: null,
          order: 3,
          status: 'PENDING',
          createdAt: new Date('2026-01-04'),
          project: { id: 'proj-1', title: 'Khandesh' },
        },
      ] as any);

      prismaRead.project.findMany.mockResolvedValue([
        {
          id: 'proj-1',
          quote: {
            paymentSchedule: [
              { label: 'Deposit', percentage: 30, amountPaise: 2250000, dueTrigger: 'on_accept' },
              {
                label: 'Mid-project payment',
                percentage: 40,
                amountPaise: 3000000,
                dueTrigger: 'on_prior_approved',
              },
              {
                label: 'Final payment',
                percentage: 30,
                amountPaise: 2250000,
                dueTrigger: 'on_prior_approved',
              },
            ],
          },
        },
      ] as any);

      prismaRead.payment.findMany.mockResolvedValue([
        {
          id: 'pay-deposit',
          milestoneId: 'deposit',
          projectId: 'proj-1',
          amount: 2250000,
          status: 'COMPLETED',
          paymentRequestedAt: null,
          createdAt: new Date('2026-01-03'),
        },
        {
          id: 'pay-mid',
          milestoneId: 'mid',
          projectId: 'proj-1',
          amount: 3000000,
          status: 'CREATED',
          paymentRequestedAt: new Date('2026-01-04'),
          createdAt: new Date('2026-01-05'),
        },
        {
          id: 'pay-final',
          milestoneId: 'final',
          projectId: 'proj-1',
          amount: 2250000,
          status: 'CREATED',
          paymentRequestedAt: null,
          createdAt: new Date('2026-01-06'),
        },
      ] as any);

      const rows = await service.listMilestones('proj-1');
      const qa = rows.find((r) => r.id === 'w3');
      expect(qa?.linkedInstallmentId).toBe('final');
      expect(qa?.linkedInstallmentName).toBe('Final payment');
      expect(qa?.linkedInstallmentInclusive).toBe(true);
      expect(qa?.billableAmount).toBe(2250000);
      expect(qa?.latestStatus).toBe('CREATED');
    });
  });

  describe('getPaymentsByMilestone', () => {
    it('should return payments for a milestone', async () => {
      prismaRead.payment.findMany.mockResolvedValue([{ id: 'p1' }] as any);

      const result = await service.getPaymentsByMilestone('m1');

      expect(prismaRead.payment.findMany).toHaveBeenCalledWith({
        where: { milestoneId: 'm1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('getMilestonePaymentStatus', () => {
    it('should calculate total paid for milestone', async () => {
      prismaRead.payment.findMany.mockResolvedValue([
        { amount: 100, status: 'COMPLETED', amountRefunded: 0 },
        { amount: 50, status: 'REFUNDED', amountRefunded: 50 },
        { amount: 200, status: 'PENDING', amountRefunded: 0 },
      ] as any);

      const result = await service.getMilestonePaymentStatus('m1');

      expect(prismaRead.payment.findMany).toHaveBeenCalledWith({
        where: { milestoneId: 'm1' },
        select: { amount: true, status: true, amountRefunded: true },
      });
      expect(result.totalPaid).toBe(100); // 100 + (50 - 50)
      expect(result.paymentsCount).toBe(3);
    });
  });
});
