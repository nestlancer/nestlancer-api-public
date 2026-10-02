import {
  DepositMilestoneCandidate,
  isDepositMilestoneName,
  isPaymentScheduleMilestone,
  isPayOnlyMilestone,
  pickDepositMilestoneId,
  projectHasWorkMilestones,
  resolveInstallmentMilestoneForWorkApproval,
  sortMilestonesForDeposit,
} from './deposit-milestone.util';

export type MilestoneSequenceRow = DepositMilestoneCandidate & {
  name?: string | null;
  status?: string | null;
};

export type PaymentSnapshot = {
  milestoneId: string;
  status: string;
  paymentRequestedAt?: Date | string | null;
};

export type MilestonePhase = {
  index: number;
  depositId?: string;
  workId?: string;
  installmentId?: string;
};

export type MilestoneClientAccess = {
  sequenceIndex: number;
  isLocked: boolean;
  lockReason?: string;
  canPay: boolean;
  canReviewDelivery: boolean;
  canRequestPrePaymentRevision: boolean;
  isPaidAndLocked: boolean;
};

function isPaid(payments: PaymentSnapshot[], milestoneId: string | undefined): boolean {
  if (!milestoneId) return true;
  return payments.some(
    (p) => p.milestoneId === milestoneId && p.status.toUpperCase() === 'COMPLETED',
  );
}

function hasOpenPaymentRequest(
  payments: PaymentSnapshot[],
  milestoneId: string | undefined,
): boolean {
  if (!milestoneId) return false;
  const pay = payments.find((p) => p.milestoneId === milestoneId);
  if (!pay) return false;
  if (pay.status.toUpperCase() === 'COMPLETED') return false;
  return Boolean(pay.paymentRequestedAt);
}

function normalizeStatus(status: string | null | undefined): string {
  return (status ?? '').trim().toUpperCase();
}

function isPlaceholderDelivery(m: MilestoneSequenceRow): boolean {
  return (
    String(m.name ?? '').trim().toLowerCase() === 'project delivery' &&
    Number(m.amount ?? 0) === 0
  );
}

/** Canonical delivery phases: deposit, then each work milestone + linked installment. */
export function buildMilestonePhases(
  milestones: MilestoneSequenceRow[],
  depositId: string | null,
): MilestonePhase[] {
  const sorted = sortMilestonesForDeposit(milestones);
  const phases: MilestonePhase[] = [];

  if (depositId) {
    phases.push({ index: 0, depositId });
  }

  if (!projectHasWorkMilestones(milestones)) {
    for (const m of sorted) {
      if (m.id === depositId) continue;
      phases.push({ index: phases.length, installmentId: m.id });
    }
    return phases;
  }

  const rawWorkRows = sorted.filter((m) => !isPaymentScheduleMilestone(m));
  const hasExplicitWork = rawWorkRows.some(
    (m) => !isPlaceholderDelivery(m) || normalizeStatus(m.status) !== 'PENDING',
  );
  const workRows = hasExplicitWork
    ? rawWorkRows.filter(
        (m) => !isPlaceholderDelivery(m) || normalizeStatus(m.status) !== 'PENDING',
      )
    : rawWorkRows;

  for (const work of workRows) {
    const installment = resolveInstallmentMilestoneForWorkApproval(work, sorted, depositId);
    const installmentId =
      installment.id !== work.id && isPaymentScheduleMilestone(installment)
        ? installment.id
        : undefined;
    phases.push({ index: phases.length, workId: work.id, installmentId });
  }

  return phases;
}

export function findPhaseForMilestone(
  phases: MilestonePhase[],
  milestoneId: string,
): MilestonePhase | undefined {
  return phases.find(
    (p) =>
      p.depositId === milestoneId || p.workId === milestoneId || p.installmentId === milestoneId,
  );
}

function isPhaseComplete(
  phase: MilestonePhase,
  milestones: MilestoneSequenceRow[],
  payments: PaymentSnapshot[],
): boolean {
  if (phase.depositId) {
    return isPaid(payments, phase.depositId);
  }

  const work = milestones.find((m) => m.id === phase.workId);
  if (!work) return false;
  if (normalizeStatus(work.status) !== 'APPROVED') return false;
  if (!phase.installmentId) return true;
  return isPaid(payments, phase.installmentId);
}

/** First phase that still blocks later milestones (payment due, review pending, or unpaid installment). */
export function findBlockingPhaseIndex(
  phases: MilestonePhase[],
  milestones: MilestoneSequenceRow[],
  payments: PaymentSnapshot[],
): number | null {
  for (const phase of phases) {
    if (phase.depositId) {
      if (!isPaid(payments, phase.depositId)) return phase.index;
      continue;
    }

    const work = milestones.find((m) => m.id === phase.workId);
    if (!work) continue;

    const workStatus = normalizeStatus(work.status);
    if (workStatus === 'COMPLETED') {
      return phase.index;
    }
    if (workStatus === 'REVISION_REQUESTED' || workStatus === 'IN_PROGRESS') {
      return phase.index;
    }
    if (workStatus === 'APPROVED') {
      if (phase.installmentId && !isPaid(payments, phase.installmentId)) {
        return phase.index;
      }
      continue;
    }
    if (workStatus === 'PENDING') {
      return phase.index;
    }
  }
  return null;
}

export function resolveMilestoneClientAccess(
  milestoneId: string,
  milestones: MilestoneSequenceRow[],
  payments: PaymentSnapshot[],
  depositId: string | null,
): MilestoneClientAccess {
  const phases = buildMilestonePhases(milestones, depositId);
  const phase = findPhaseForMilestone(phases, milestoneId);
  const blockingIndex = findBlockingPhaseIndex(phases, milestones, payments);
  const sequenceIndex = phase?.index ?? 0;

  const milestone = milestones.find((m) => m.id === milestoneId);
  const status = normalizeStatus(milestone?.status);
  const payOnly = milestone ? isPayOnlyMilestone(milestone, milestones, depositId) : false;
  const isDeposit = depositId === milestoneId;

  const defaultAccess: MilestoneClientAccess = {
    sequenceIndex,
    isLocked: false,
    canPay: false,
    canReviewDelivery: false,
    canRequestPrePaymentRevision: false,
    isPaidAndLocked: false,
  };

  if (!milestone || !phase) return defaultAccess;

  const isLocked = blockingIndex != null && sequenceIndex > blockingIndex;
  const lockReason = isLocked
    ? 'Complete the current milestone (payment or delivery review) before moving to later milestones.'
    : undefined;

  const installmentId =
    phase.installmentId ??
    (phase.workId === milestoneId
      ? resolveInstallmentMilestoneForWorkApproval(milestone, milestones, depositId).id
      : undefined);

  const installmentPaid = isPaid(payments, installmentId);
  const openPaymentRequest = hasOpenPaymentRequest(payments, installmentId);

  const canReviewDelivery = !isLocked && !isDeposit && !payOnly && status === 'COMPLETED';

  const canRequestPrePaymentRevision =
    !isLocked &&
    !isDeposit &&
    !payOnly &&
    status === 'APPROVED' &&
    Boolean(installmentId) &&
    openPaymentRequest &&
    !installmentPaid;

  const isPaidAndLocked =
    !isDeposit && !payOnly && status === 'APPROVED' && (!installmentId || installmentPaid);

  let canPay = false;
  if (!isLocked) {
    if (isDeposit) {
      canPay = !isPaid(payments, milestoneId);
    } else if (payOnly) {
      canPay = openPaymentRequest && !installmentPaid;
    } else if (status === 'APPROVED' && installmentId) {
      canPay = openPaymentRequest && !installmentPaid;
    }
  }

  return {
    sequenceIndex,
    isLocked,
    lockReason,
    canPay,
    canReviewDelivery,
    canRequestPrePaymentRevision,
    isPaidAndLocked,
  };
}

export function pickDepositIdFromContext(
  milestones: MilestoneSequenceRow[],
  payments: PaymentSnapshot[],
): string | null {
  const withPay = payments.map((p) => p.milestoneId);
  return pickDepositMilestoneId(milestones, withPay);
}
