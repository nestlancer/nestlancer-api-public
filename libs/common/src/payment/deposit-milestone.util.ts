/**
 * Deposit is the first payment-schedule milestone for a project.
 *
 * Prefer the earliest (order, then createdAt) milestone that already has a
 * linked payment row — schedule creation always attaches payments, while
 * extra work-only milestones may share the same `order` without payments.
 * Falls back to the earliest milestone when no payments exist yet.
 *
 * When a project also has dedicated work milestones (seed / admin-created),
 * later schedule rows (Mid / Final / Milestone N) are pay-only — delivery
 * submit/approve happens on the work milestones, then installment pay.
 *
 * Work ↔ installment pairing (dual model):
 * 1. Prefer schedule row at `work.order + 1` (Design@1 → Mid@2).
 * 2. Else pair by sorted work index to post-deposit installments.
 * 3. Trailing work beyond installment count is included in the last installment
 *    (display + approval); UI should label it as "included in …".
 */
import { parseJsonArray } from './payment-schedule.util';
import type { PaymentScheduleInstallment } from './payment-schedule.types';

export type DepositMilestoneCandidate = {
  id: string;
  order: number;
  createdAt?: Date | string | null;
  name?: string | null;
  percentage?: number | null;
  status?: string | null;
  amount?: number | null;
};

export type MilestoneScheduleProbe = Pick<DepositMilestoneCandidate, 'id' | 'name' | 'percentage'>;

export type LinkedInstallmentResolution = {
  installment: DepositMilestoneCandidate & { name?: string | null };
  /** True when work is beyond 1:1 installment pairing (included in last installment). */
  inclusive: boolean;
};

/** Canonical quote payment-schedule labels and generated installment names. */
const CANONICAL_SCHEDULE_NAME =
  /^(deposit|full payment|mid[- ]?project payment|final payment|milestone \d+|payment \d+)\b/i;

export function extractScheduleLabelSet(paymentSchedule: unknown): ReadonlySet<string> {
  const rows = parseJsonArray<PaymentScheduleInstallment>(paymentSchedule);
  const labels = new Set<string>();
  for (const row of rows) {
    const label = row.label?.trim();
    if (label) labels.add(label.toLowerCase());
  }
  return labels;
}

export function sortMilestonesForDeposit(
  milestones: DepositMilestoneCandidate[],
): DepositMilestoneCandidate[] {
  return [...milestones].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return aTime - bTime;
  });
}

export function pickDepositMilestoneId(
  milestones: DepositMilestoneCandidate[],
  milestoneIdsWithPayments: Iterable<string>,
): string | null {
  if (milestones.length === 0) return null;
  const sorted = sortMilestonesForDeposit(milestones);
  const withPay = new Set(milestoneIdsWithPayments);
  const byName = sorted.find((m) => isDepositMilestoneName(m.name) && withPay.has(m.id));
  if (byName) return byName.id;
  const deposit = sorted.find((m) => withPay.has(m.id)) ?? sorted[0];
  return deposit?.id ?? null;
}

export function isDepositMilestoneName(name: string | null | undefined): boolean {
  return /^\s*deposit\b/i.test(name ?? '');
}

/** Name-only check (expanded patterns). Prefer {@link isPaymentScheduleMilestone} when percentage/labels are available. */
export function isPaymentScheduleMilestoneName(
  name: string | null | undefined,
  scheduleLabels?: ReadonlySet<string>,
): boolean {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return false;
  if (CANONICAL_SCHEDULE_NAME.test(trimmed)) return true;
  if (scheduleLabels?.has(trimmed.toLowerCase())) return true;
  return false;
}

/**
 * True when a milestone row belongs to the quote payment schedule (not admin work/delivery).
 * Uses label patterns, quote schedule labels, and persisted percentage from schedule setup.
 */
export function isPaymentScheduleMilestone(
  milestone: MilestoneScheduleProbe,
  scheduleLabels?: ReadonlySet<string>,
): boolean {
  if (isPaymentScheduleMilestoneName(milestone.name, scheduleLabels)) return true;
  if (milestone.percentage != null && milestone.percentage > 0) return true;
  return false;
}

/**
 * True when the project has at least one non-schedule (work/delivery) milestone.
 * In that dual model, post-deposit schedule rows are pay-only.
 */
export function projectHasWorkMilestones(
  milestones: MilestoneScheduleProbe[],
  scheduleLabels?: ReadonlySet<string>,
): boolean {
  return milestones.some((m) => !isPaymentScheduleMilestone(m, scheduleLabels));
}

/**
 * Pay-only milestones: Deposit always; Mid/Final named installments always;
 * other schedule rows when dedicated work milestones exist.
 * Schedule-only "Milestone N" rows stay deliverable (complete → approve → pay).
 */
export function isPayOnlyMilestone(
  milestone: { id: string; name?: string | null; percentage?: number | null },
  projectMilestones: Array<{ id: string; name?: string | null; percentage?: number | null }>,
  depositMilestoneId: string | null,
  scheduleLabels?: ReadonlySet<string>,
): boolean {
  if (depositMilestoneId && milestone.id === depositMilestoneId) return true;
  if (isDepositMilestoneName(milestone.name)) return true;
  // NL-MS-001: Mid/Final are installment-only even on schedule-only projects.
  if (/^(mid[- ]?project payment|final payment)\b/i.test(String(milestone.name ?? '').trim())) {
    return true;
  }
  if (!isPaymentScheduleMilestone(milestone, scheduleLabels)) return false;
  return projectHasWorkMilestones(projectMilestones, scheduleLabels);
}

function isPlaceholderDelivery(m: DepositMilestoneCandidate & { name?: string | null }): boolean {
  return (
    String(m.name ?? '').trim().toLowerCase() === 'project delivery' &&
    Number(m.amount ?? 0) === 0
  );
}

function listWorkMilestones(
  projectMilestones: Array<DepositMilestoneCandidate & { name?: string | null }>,
  scheduleLabels?: ReadonlySet<string>,
): Array<DepositMilestoneCandidate & { name?: string | null }> {
  const raw = sortMilestonesForDeposit(projectMilestones).filter(
    (m) => !isPaymentScheduleMilestone(m, scheduleLabels),
  );
  const hasExplicitWork = raw.some(
    (m) => !isPlaceholderDelivery(m) || ((m as any).status && (m as any).status !== 'PENDING'),
  );
  return hasExplicitWork
    ? raw.filter(
        (m) => !isPlaceholderDelivery(m) || ((m as any).status && (m as any).status !== 'PENDING'),
      )
    : raw;
}

function listPostDepositInstallments(
  projectMilestones: Array<DepositMilestoneCandidate & { name?: string | null }>,
  depositMilestoneId: string | null,
  scheduleLabels?: ReadonlySet<string>,
): Array<DepositMilestoneCandidate & { name?: string | null }> {
  return sortMilestonesForDeposit(projectMilestones).filter(
    (m) =>
      m.id !== depositMilestoneId &&
      isPaymentScheduleMilestone(m, scheduleLabels) &&
      !isDepositMilestoneName(m.name) &&
      isPayOnlyMilestone(m, projectMilestones, depositMilestoneId, scheduleLabels),
  );
}

/**
 * Resolve which schedule installment a work milestone links to.
 * See file header for pairing rules.
 */
export function resolveLinkedInstallmentResolution(
  workMilestone: DepositMilestoneCandidate & { name?: string | null },
  projectMilestones: Array<DepositMilestoneCandidate & { name?: string | null }>,
  depositMilestoneId: string | null,
  scheduleLabels?: ReadonlySet<string>,
): LinkedInstallmentResolution | null {
  if (isPaymentScheduleMilestone(workMilestone, scheduleLabels)) return null;
  if (!projectHasWorkMilestones(projectMilestones, scheduleLabels)) return null;

  const installments = listPostDepositInstallments(
    projectMilestones,
    depositMilestoneId,
    scheduleLabels,
  );
  if (installments.length === 0) return null;

  const byOrder = installments.find((m) => m.order === workMilestone.order + 1);
  if (byOrder) return { installment: byOrder, inclusive: false };

  const workRows = listWorkMilestones(projectMilestones, scheduleLabels);
  const workIndex = workRows.findIndex((w) => w.id === workMilestone.id);
  if (workIndex < 0) return null;

  if (workIndex < installments.length) {
    return { installment: installments[workIndex]!, inclusive: false };
  }

  return {
    installment: installments[installments.length - 1]!,
    inclusive: true,
  };
}

/**
 * In the dual work + schedule model, client approval on a work milestone unlocks
 * payment on the linked schedule installment (order+1, index pair, or last for trailing).
 */
export function resolveInstallmentMilestoneForWorkApproval(
  approvedMilestone: DepositMilestoneCandidate & { name?: string | null },
  projectMilestones: Array<DepositMilestoneCandidate & { name?: string | null }>,
  depositMilestoneId: string | null,
  scheduleLabels?: ReadonlySet<string>,
): DepositMilestoneCandidate & { name?: string | null } {
  if (
    isPaymentScheduleMilestone(approvedMilestone, scheduleLabels) ||
    !projectHasWorkMilestones(projectMilestones, scheduleLabels)
  ) {
    return approvedMilestone;
  }

  const linked = resolveLinkedInstallmentResolution(
    approvedMilestone,
    projectMilestones,
    depositMilestoneId,
    scheduleLabels,
  );

  return linked?.installment ?? approvedMilestone;
}

/**
 * For dual work + schedule projects, the installment billed after a work milestone.
 * Used by admin APIs to surface payment status on work rows.
 */
export function resolveLinkedInstallmentForWorkDisplay(
  workMilestone: DepositMilestoneCandidate & { name?: string | null },
  projectMilestones: Array<DepositMilestoneCandidate & { name?: string | null }>,
  depositMilestoneId: string | null,
  scheduleLabels?: ReadonlySet<string>,
): (DepositMilestoneCandidate & { name?: string | null }) | null {
  return (
    resolveLinkedInstallmentResolution(
      workMilestone,
      projectMilestones,
      depositMilestoneId,
      scheduleLabels,
    )?.installment ?? null
  );
}
