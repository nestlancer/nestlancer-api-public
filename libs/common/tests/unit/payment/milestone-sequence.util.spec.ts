import {
  buildMilestonePhases,
  findBlockingPhaseIndex,
  resolveMilestoneClientAccess,
} from '../../../src/payment/milestone-sequence.util';

describe('milestone-sequence.util', () => {
  const dualMilestones = [
    { id: 'dep', order: 1, createdAt: '2026-01-01', name: 'Deposit', status: 'APPROVED' },
    {
      id: 'w1',
      order: 1,
      createdAt: '2026-01-02',
      name: 'Design & Architecture',
      status: 'APPROVED',
    },
    {
      id: 'mid',
      order: 2,
      createdAt: '2026-01-01',
      name: 'Mid-project payment',
      status: 'PENDING',
    },
    {
      id: 'w2',
      order: 2,
      createdAt: '2026-01-03',
      name: 'Storefront & Checkout',
      status: 'COMPLETED',
    },
    { id: 'final', order: 3, createdAt: '2026-01-01', name: 'Final payment', status: 'PENDING' },
    { id: 'w3', order: 3, createdAt: '2026-01-04', name: 'QA, SEO & Launch', status: 'PENDING' },
  ];

  const payments = [
    { milestoneId: 'dep', status: 'COMPLETED', paymentRequestedAt: null },
    {
      milestoneId: 'mid',
      status: 'CREATED',
      paymentRequestedAt: '2026-07-30T07:48:21.286Z',
    },
  ];

  it('builds deposit + work/installment phases', () => {
    const phases = buildMilestonePhases(dualMilestones, 'dep');
    expect(phases).toHaveLength(4);
    expect(phases[1]).toMatchObject({ workId: 'w1', installmentId: 'mid' });
    expect(phases[2]).toMatchObject({ workId: 'w2', installmentId: 'final' });
    expect(phases[3]).toMatchObject({ workId: 'w3', installmentId: 'final' });
  });

  it('blocks later milestones while mid installment is unpaid', () => {
    const phases = buildMilestonePhases(dualMilestones, 'dep');
    expect(findBlockingPhaseIndex(phases, dualMilestones, payments)).toBe(1);

    const design = resolveMilestoneClientAccess('w1', dualMilestones, payments, 'dep');
    expect(design.isLocked).toBe(false);
    expect(design.canRequestPrePaymentRevision).toBe(true);
    expect(design.canPay).toBe(true);

    const storefront = resolveMilestoneClientAccess('w2', dualMilestones, payments, 'dep');
    expect(storefront.isLocked).toBe(true);
    expect(storefront.canReviewDelivery).toBe(false);
  });

  it('locks paid work milestone until next delivery cycle', () => {
    const paidMid = [
      ...payments,
      { milestoneId: 'mid', status: 'COMPLETED', paymentRequestedAt: '2026-07-30' },
    ];
    const design = resolveMilestoneClientAccess('w1', dualMilestones, paidMid, 'dep');
    expect(design.isPaidAndLocked).toBe(true);
    expect(design.canRequestPrePaymentRevision).toBe(false);

    const storefront = resolveMilestoneClientAccess('w2', dualMilestones, paidMid, 'dep');
    expect(storefront.isLocked).toBe(false);
    expect(storefront.canReviewDelivery).toBe(true);
  });

  it('supports four-installment schedule-only projects', () => {
    const scheduleOnly = [
      {
        id: 'dep',
        order: 1,
        createdAt: '2026-01-01',
        name: 'Deposit',
        percentage: 25,
        status: 'APPROVED',
      },
      {
        id: 'm2',
        order: 2,
        createdAt: '2026-01-01',
        name: 'Milestone 2',
        percentage: 25,
        status: 'PENDING',
      },
      {
        id: 'm3',
        order: 3,
        createdAt: '2026-01-01',
        name: 'Milestone 3',
        percentage: 25,
        status: 'PENDING',
      },
      {
        id: 'fin',
        order: 4,
        createdAt: '2026-01-01',
        name: 'Final payment',
        percentage: 25,
        status: 'PENDING',
      },
    ];
    const phases = buildMilestonePhases(scheduleOnly, 'dep');
    expect(phases).toHaveLength(4);
    expect(phases.map((p) => p.installmentId)).toEqual([undefined, 'm2', 'm3', 'fin']);
  });
});
