import { Test, TestingModule } from '@nestjs/testing';
import { PaymentCompletionService } from '@nestlancer/common';
import { PrismaWriteService } from '@nestlancer/database';
import { PaymentStatus } from '@nestlancer/common';

describe('PaymentCompletionService', () => {
  let service: PaymentCompletionService;
  let prismaWrite: { $transaction: jest.Mock };

  const buildTx = (overrides: Partial<Record<string, unknown>> = {}) => {
    const project = {
      findUnique: jest.fn().mockResolvedValue({ id: 'proj-1', status: 'SUSPENDED' }),
      update: jest.fn().mockResolvedValue({}),
      ...(overrides.project as object),
    };
    const payment = {
      count: jest.fn().mockResolvedValue(1),
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      ...(overrides.payment as object),
    };
    const milestone = {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
      ...(overrides.milestone as object),
    };
    const outbox = { create: jest.fn().mockResolvedValue({}) };
    const auditLog = { create: jest.fn().mockResolvedValue({}) };
    const progressEntry = { create: jest.fn().mockResolvedValue({}) };

    return { project, payment, milestone, outbox, auditLog, progressEntry };
  };

  beforeEach(async () => {
    prismaWrite = { $transaction: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentCompletionService, { provide: PrismaWriteService, useValue: prismaWrite }],
    }).compile();

    service = module.get(PaymentCompletionService);
  });

  it('restores SUSPENDED project to IN_PROGRESS and emits PROJECT_RESUMED', async () => {
    const tx = buildTx();
    prismaWrite.$transaction.mockImplementation(async (cb: (t: unknown) => Promise<void>) =>
      cb(tx),
    );

    await service.finalizeExistingPayment({
      paymentId: 'pay-1',
      projectId: 'proj-1',
      milestoneId: 'ms-1',
      amount: 50000,
      currency: 'INR',
      clientId: 'user-1',
      source: 'razorpay_confirm',
    });

    expect(tx.project.update).toHaveBeenCalledWith({
      where: { id: 'proj-1' },
      data: { status: 'IN_PROGRESS' },
    });

    const outboxTypes = tx.outbox.create.mock.calls.map((c) => c[0].data.type);
    expect(outboxTypes).toContain('PAYMENT_COMPLETED');
    expect(outboxTypes).toContain('PROJECT_RESUMED');
    expect(outboxTypes).toContain('PROJECT_STATUS_CHANGED');
  });

  it('activates PENDING_PAYMENT project on first deposit payment', async () => {
    const tx = buildTx({
      project: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: 'proj-1', status: 'PENDING_PAYMENT' })
          .mockResolvedValue({ id: 'proj-1', status: 'PENDING_PAYMENT' }),
        update: jest.fn().mockResolvedValue({}),
      },
    });
    prismaWrite.$transaction.mockImplementation(async (cb: (t: unknown) => Promise<void>) =>
      cb(tx),
    );

    await service.finalizeExistingPayment({
      paymentId: 'pay-dep',
      projectId: 'proj-1',
      amount: 10000,
      currency: 'INR',
      clientId: 'user-1',
    });

    expect(tx.project.update).toHaveBeenCalledWith({
      where: { id: 'proj-1' },
      data: { status: 'IN_PROGRESS' },
    });
  });

  it('does not mark schedule-only installment APPROVED when payment completes (NL-BUG-MS-003)', async () => {
    const tx = buildTx({
      project: {
        findUnique: jest.fn().mockResolvedValue({ id: 'proj-1', status: 'IN_PROGRESS' }),
        update: jest.fn().mockResolvedValue({}),
      },
      milestone: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: 'ms-final', status: 'PENDING' })
          .mockResolvedValue({ id: 'ms-final', status: 'PENDING' }),
        findMany: jest.fn().mockResolvedValue([
          { id: 'ms-dep', name: 'Deposit', order: 1, createdAt: new Date('2026-01-01') },
          { id: 'ms-final', name: 'Final payment', order: 2, createdAt: new Date('2026-01-02') },
        ]),
        update: jest.fn().mockResolvedValue({}),
      },
      payment: {
        count: jest.fn().mockResolvedValue(2),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([
          { milestoneId: 'ms-dep' },
          { milestoneId: 'ms-final' },
        ]),
      },
    });
    prismaWrite.$transaction.mockImplementation(async (cb: (t: unknown) => Promise<void>) =>
      cb(tx),
    );

    await service.finalizeExistingPayment({
      paymentId: 'pay-final',
      projectId: 'proj-1',
      milestoneId: 'ms-final',
      amount: 4000000,
      currency: 'INR',
      clientId: 'user-1',
      source: 'manual',
    });

    const approvedCalls = tx.milestone.update.mock.calls.filter(
      (c: unknown[]) => (c[0] as { data?: { status?: string } })?.data?.status === 'APPROVED',
    );
    expect(approvedCalls).toHaveLength(0);
  });

  it('applies revision overflow after payment with REVISION_OVERFLOW customNotes', async () => {
    const tx = buildTx({
      payment: {
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue({
          customNotes: 'REVISION_OVERFLOW:{"reason":"More changes","userId":"user-1"}',
          milestoneId: 'ms-1',
          projectId: 'proj-1',
          clientId: 'user-1',
        }),
      },
      milestone: {
        findUnique: jest.fn().mockResolvedValue({ revisionCount: 2, name: 'Design' }),
        update: jest.fn().mockResolvedValue({
          id: 'ms-1',
          projectId: 'proj-1',
          name: 'Design',
          revisionCount: 3,
        }),
      },
    });
    prismaWrite.$transaction.mockImplementation(async (cb: (t: unknown) => Promise<void>) =>
      cb(tx),
    );

    await service.finalizeExistingPayment({
      paymentId: 'pay-rev',
      projectId: 'proj-1',
      milestoneId: 'ms-1',
      amount: 5000,
      currency: 'INR',
      clientId: 'user-1',
    });

    expect(tx.milestone.update).toHaveBeenCalledWith({
      where: { id: 'ms-1' },
      data: { status: 'REVISION_REQUESTED', revisionCount: 3 },
    });

    const outboxTypes = tx.outbox.create.mock.calls.map((c) => c[0].data.type);
    expect(outboxTypes).toContain('MILESTONE_REVISION_REQUESTED');
  });
});
