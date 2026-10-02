import { PaymentGatingService } from '../../../src/services/payment-gating.service';
import { BusinessLogicException } from '@nestlancer/common';

describe('PaymentGatingService', () => {
  let service: PaymentGatingService;
  const prismaRead = {
    project: { findUnique: jest.fn() },
    milestone: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    payment: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PaymentGatingService(prismaRead as any);
    prismaRead.milestone.findMany.mockResolvedValue([
      { id: 'm1', order: 1, createdAt: new Date('2026-01-01') },
      { id: 'm2', order: 2, createdAt: new Date('2026-01-02') },
    ]);
    prismaRead.payment.findMany.mockResolvedValue([
      { milestoneId: 'm1', status: 'CREATED', paymentRequestedAt: null },
      { milestoneId: 'm2', status: 'CREATED', paymentRequestedAt: null },
    ]);
  });

  it('allows deposit milestone when project is PENDING_PAYMENT', async () => {
    prismaRead.project.findUnique.mockResolvedValue({
      id: 'p1',
      clientId: 'u1',
      status: 'PENDING_PAYMENT',
    });
    prismaRead.milestone.findFirst.mockResolvedValue({ id: 'm1', order: 1, status: 'PENDING' });
    prismaRead.payment.findFirst.mockResolvedValue(null);

    await expect(service.assertCanCreateIntent('u1', 'p1', 'm1')).resolves.toEqual({
      isDeposit: true,
    });
  });

  it('blocks payment when project is PENDING_CONTRACT', async () => {
    prismaRead.project.findUnique.mockResolvedValue({
      id: 'p1',
      clientId: 'u1',
      status: 'PENDING_CONTRACT',
    });

    await expect(service.assertCanCreateIntent('u1', 'p1', 'm1')).rejects.toMatchObject({
      code: 'PAYMENT_GATE_010',
    });
  });

  it('blocks later milestone when not approved', async () => {
    prismaRead.project.findUnique.mockResolvedValue({
      id: 'p1',
      clientId: 'u1',
      status: 'IN_PROGRESS',
    });
    prismaRead.milestone.findFirst.mockResolvedValue({ id: 'm2', order: 2, status: 'IN_PROGRESS' });
    prismaRead.payment.findFirst.mockResolvedValue(null);

    await expect(service.assertCanCreateIntent('u1', 'p1', 'm2')).rejects.toBeInstanceOf(
      BusinessLogicException,
    );
  });

  it('blocks request-payment on deposit milestones', async () => {
    prismaRead.milestone.findUnique.mockResolvedValue({
      id: 'm1',
      projectId: 'p1',
      name: 'Deposit',
      status: 'APPROVED',
      project: { status: 'IN_PROGRESS' },
    });
    prismaRead.milestone.findMany.mockResolvedValue([
      { id: 'm1', name: 'Deposit', order: 1, createdAt: new Date('2026-01-01') },
      { id: 'm2', name: 'Final payment', order: 2, createdAt: new Date('2026-01-02') },
    ]);

    await expect(service.assertCanRequestPayment('m1')).rejects.toMatchObject({
      code: 'PAYMENT_GATE_012',
    });
  });

  it('allows request-payment on Mid-project installment without APPROVED when work milestones exist', async () => {
    prismaRead.milestone.findUnique.mockResolvedValue({
      id: 'mid',
      projectId: 'p1',
      name: 'Mid-project payment',
      status: 'PENDING',
      project: { status: 'IN_PROGRESS' },
    });
    prismaRead.milestone.findMany.mockResolvedValue([
      { id: 'dep', name: 'Deposit', order: 1, createdAt: new Date('2026-01-01') },
      { id: 'work', name: 'Design', order: 1, createdAt: new Date('2026-01-02') },
      { id: 'mid', name: 'Mid-project payment', order: 2, createdAt: new Date('2026-01-01') },
    ]);
    prismaRead.payment.findMany.mockResolvedValue([
      { milestoneId: 'dep', status: 'COMPLETED', paymentRequestedAt: null },
      { milestoneId: 'mid', status: 'CREATED', paymentRequestedAt: null },
    ]);
    prismaRead.payment.findFirst.mockResolvedValue(null);
    prismaRead.payment.count.mockResolvedValue(1); // deposit paid

    await expect(service.assertCanRequestPayment('mid')).resolves.toBeUndefined();
  });

  it('still requires APPROVED for work milestones', async () => {
    prismaRead.milestone.findUnique.mockResolvedValue({
      id: 'work',
      projectId: 'p1',
      name: 'Design',
      status: 'IN_PROGRESS',
      project: { status: 'IN_PROGRESS' },
    });
    prismaRead.milestone.findMany.mockResolvedValue([
      { id: 'dep', name: 'Deposit', order: 1, createdAt: new Date('2026-01-01') },
      { id: 'work', name: 'Design', order: 1, createdAt: new Date('2026-01-02') },
      { id: 'mid', name: 'Mid-project payment', order: 2, createdAt: new Date('2026-01-01') },
    ]);
    prismaRead.payment.findMany.mockResolvedValue([
      { milestoneId: 'dep', status: 'COMPLETED', paymentRequestedAt: null },
      { milestoneId: 'mid', status: 'CREATED', paymentRequestedAt: null },
    ]);
    prismaRead.payment.findFirst
      .mockResolvedValueOnce(null) // not paid
      .mockResolvedValueOnce(null); // no payment row on work

    await expect(service.assertCanRequestPayment('work')).rejects.toMatchObject({
      code: 'PAYMENT_GATE_009',
    });
  });

  it('blocks request-payment on dual-model work milestones even when APPROVED', async () => {
    prismaRead.milestone.findUnique.mockResolvedValue({
      id: 'work',
      projectId: 'p1',
      name: 'Design',
      status: 'APPROVED',
      project: { status: 'IN_PROGRESS' },
    });
    prismaRead.milestone.findMany.mockResolvedValue([
      { id: 'dep', name: 'Deposit', order: 1, createdAt: new Date('2026-01-01') },
      { id: 'work', name: 'Design', order: 1, createdAt: new Date('2026-01-02') },
      { id: 'mid', name: 'Mid-project payment', order: 2, createdAt: new Date('2026-01-01') },
    ]);
    prismaRead.payment.findMany.mockResolvedValue([
      { milestoneId: 'dep', status: 'COMPLETED', paymentRequestedAt: null },
      { milestoneId: 'mid', status: 'CREATED', paymentRequestedAt: null },
    ]);
    prismaRead.payment.findFirst
      .mockResolvedValueOnce(null) // not paid
      .mockResolvedValueOnce(null); // no payment row on work

    await expect(service.assertCanRequestPayment('work')).rejects.toMatchObject({
      code: 'PAYMENT_GATE_009',
    });
  });
});
