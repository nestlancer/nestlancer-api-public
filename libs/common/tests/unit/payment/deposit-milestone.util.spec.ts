import {
  extractScheduleLabelSet,
  isDepositMilestoneName,
  isPaymentScheduleMilestone,
  isPaymentScheduleMilestoneName,
  isPayOnlyMilestone,
  pickDepositMilestoneId,
  projectHasWorkMilestones,
  resolveInstallmentMilestoneForWorkApproval,
  resolveLinkedInstallmentForWorkDisplay,
  resolveLinkedInstallmentResolution,
} from '../../../src/payment/deposit-milestone.util';

describe('deposit-milestone.util', () => {
  it('picks the earliest payment-bearing milestone as deposit', () => {
    const milestones = [
      { id: 'work', order: 1, createdAt: '2026-01-02', name: 'Design' },
      { id: 'deposit', order: 1, createdAt: '2026-01-01', name: 'Deposit' },
      { id: 'final', order: 2, createdAt: '2026-01-01', name: 'Final payment' },
    ];
    expect(pickDepositMilestoneId(milestones, ['deposit', 'final'])).toBe('deposit');
  });

  it('falls back to earliest milestone when no payments exist', () => {
    const milestones = [
      { id: 'a', order: 2, createdAt: '2026-01-01' },
      { id: 'b', order: 1, createdAt: '2026-01-02' },
    ];
    expect(pickDepositMilestoneId(milestones, [])).toBe('b');
  });

  it('detects deposit and schedule names', () => {
    expect(isDepositMilestoneName('Deposit')).toBe(true);
    expect(isDepositMilestoneName('Deposit — 30%')).toBe(true);
    expect(isDepositMilestoneName('Final payment')).toBe(false);
    expect(isPaymentScheduleMilestoneName('Mid-project payment')).toBe(true);
    expect(isPaymentScheduleMilestoneName('Final payment')).toBe(true);
    expect(isPaymentScheduleMilestoneName('Milestone 2')).toBe(true);
    expect(isPaymentScheduleMilestoneName('Full payment')).toBe(true);
    expect(isPaymentScheduleMilestoneName('Design & Architecture')).toBe(false);
  });

  it('classifies schedule rows by quote label and percentage', () => {
    const labels = extractScheduleLabelSet([
      { label: 'Phase A', amountPaise: 100, dueTrigger: 'on_accept' },
      { label: 'Phase B', amountPaise: 200, dueTrigger: 'on_prior_approved' },
    ]);
    expect(isPaymentScheduleMilestone({ name: 'Phase A' }, labels)).toBe(true);
    expect(isPaymentScheduleMilestone({ name: 'Custom delivery', percentage: 25 })).toBe(true);
    expect(isPaymentScheduleMilestone({ name: 'Custom delivery' })).toBe(false);
  });

  it('marks post-deposit installments pay-only only when work milestones exist', () => {
    const dual = [
      { id: 'd', name: 'Deposit', percentage: 30 },
      { id: 'w', name: 'Design & Architecture' },
      { id: 'm', name: 'Mid-project payment', percentage: 40 },
      { id: 'f', name: 'Final payment', percentage: 30 },
    ];
    expect(projectHasWorkMilestones(dual)).toBe(true);
    expect(isPayOnlyMilestone(dual[0], dual, 'd')).toBe(true);
    expect(isPayOnlyMilestone(dual[1], dual, 'd')).toBe(false);
    expect(isPayOnlyMilestone(dual[2], dual, 'd')).toBe(true);
    expect(isPayOnlyMilestone(dual[3], dual, 'd')).toBe(true);

    const fourInstallment = [
      { id: 'd', name: 'Deposit', percentage: 25 },
      { id: 'm2', name: 'Milestone 2', percentage: 25 },
      { id: 'm3', name: 'Milestone 3', percentage: 25 },
      { id: 'f', name: 'Final payment', percentage: 25 },
    ];
    expect(projectHasWorkMilestones(fourInstallment)).toBe(false);
    expect(isPayOnlyMilestone(fourInstallment[1], fourInstallment, 'd')).toBe(false);
    // NL-MS-001: Final/Mid named installments are always pay-only.
    expect(isPayOnlyMilestone(fourInstallment[3], fourInstallment, 'd')).toBe(true);

    const dualFour = [...fourInstallment, { id: 'w', name: 'Delivery MVP' }];
    expect(projectHasWorkMilestones(dualFour)).toBe(true);
    expect(isPayOnlyMilestone(dualFour[1], dualFour, 'd')).toBe(true);
  });

  it('maps approved work milestones to the next schedule installment', () => {
    const dual = [
      { id: 'd', order: 1, createdAt: '2026-01-01', name: 'Deposit', percentage: 30 },
      { id: 'w1', order: 1, createdAt: '2026-01-02', name: 'Design & Architecture' },
      { id: 'm', order: 2, createdAt: '2026-01-01', name: 'Mid-project payment', percentage: 40 },
      { id: 'w2', order: 2, createdAt: '2026-01-03', name: 'Storefront & Checkout' },
      { id: 'f', order: 3, createdAt: '2026-01-01', name: 'Final payment', percentage: 30 },
    ];
    const work = dual.find((m) => m.id === 'w1')!;
    expect(resolveInstallmentMilestoneForWorkApproval(work, dual, 'd').id).toBe('m');
    const work2 = dual.find((m) => m.id === 'w2')!;
    expect(resolveInstallmentMilestoneForWorkApproval(work2, dual, 'd').id).toBe('f');
  });

  it('resolves linked installment for work milestone display', () => {
    const dual = [
      { id: 'd', order: 1, createdAt: '2026-01-01', name: 'Deposit', percentage: 30 },
      { id: 'w', order: 1, createdAt: '2026-01-02', name: 'Batch Tracking MVP' },
      { id: 'm', order: 2, createdAt: '2026-01-01', name: 'Mid-project payment', percentage: 40 },
      { id: 'f', order: 3, createdAt: '2026-01-01', name: 'Final payment', percentage: 30 },
    ];
    const work = dual.find((m) => m.id === 'w')!;
    expect(resolveLinkedInstallmentForWorkDisplay(work, dual, 'd')?.id).toBe('m');
    expect(resolveLinkedInstallmentForWorkDisplay(dual[0], dual, 'd')).toBeNull();
    expect(resolveLinkedInstallmentForWorkDisplay(dual[2], dual, 'd')).toBeNull();
  });

  it('includes trailing work milestones in the last installment', () => {
    const dual = [
      { id: 'd', order: 1, createdAt: '2026-01-01', name: 'Deposit', percentage: 30 },
      { id: 'w1', order: 1, createdAt: '2026-01-02', name: 'Design & Architecture' },
      { id: 'm', order: 2, createdAt: '2026-01-01', name: 'Mid-project payment', percentage: 40 },
      { id: 'w2', order: 2, createdAt: '2026-01-03', name: 'Storefront & Checkout' },
      { id: 'f', order: 3, createdAt: '2026-01-01', name: 'Final payment', percentage: 30 },
      { id: 'w3', order: 3, createdAt: '2026-01-04', name: 'QA, SEO & Launch' },
    ];
    expect(resolveLinkedInstallmentForWorkDisplay(dual[1]!, dual, 'd')?.id).toBe('m');
    expect(resolveLinkedInstallmentForWorkDisplay(dual[3]!, dual, 'd')?.id).toBe('f');
    const trailing = resolveLinkedInstallmentResolution(dual[5]!, dual, 'd');
    expect(trailing?.installment.id).toBe('f');
    expect(trailing?.inclusive).toBe(true);
    expect(resolveInstallmentMilestoneForWorkApproval(dual[5]!, dual, 'd').id).toBe('f');
  });

  it('supports four-installment schedules via Milestone N labels', () => {
    const scheduleOnly = [
      { id: 'd', order: 1, name: 'Deposit', percentage: 25 },
      { id: 'm2', order: 2, name: 'Milestone 2', percentage: 25 },
      { id: 'm3', order: 3, name: 'Milestone 3', percentage: 25 },
      { id: 'f', order: 4, name: 'Final payment', percentage: 25 },
    ];
    expect(isPaymentScheduleMilestone(scheduleOnly[1])).toBe(true);
    expect(projectHasWorkMilestones(scheduleOnly)).toBe(false);
  });
});
