import { Injectable } from '@nestjs/common';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';
import {
  extractScheduleLabelSet,
  isPaymentScheduleMilestone,
  isPayOnlyMilestone,
  pickDepositMilestoneId,
  resolveLinkedInstallmentResolution,
} from '@nestlancer/common';

const OPEN_DELIVERABLE_STATUSES = [
  'READY_FOR_REVIEW',
  'PENDING',
  'IN_PROGRESS',
  'REVISION_REQUESTED',
] as const;

@Injectable()
export class PaymentMilestonesService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
  ) {}

  /** List project milestones with linked payment summary (admin). */
  async listMilestones(projectId?: string): Promise<
    Array<{
      id: string;
      milestoneId: string;
      projectId: string;
      projectTitle: string;
      project: { id: string; title: string };
      name: string;
      amount: number | null;
      order: number;
      status: string;
      totalAmount: number;
      paymentsCount: number;
      latestPaymentId: string | null;
      latestStatus: string | null;
      paymentRequestedAt: string | null;
      isDeposit: boolean;
      isPayOnly: boolean;
      linkedInstallmentId: string | null;
      linkedInstallmentName: string | null;
      /** Trailing work beyond 1:1 installment pairing — included in last installment. */
      linkedInstallmentInclusive: boolean;
      /** Amount due on the billable installment (schedule amount when linked). */
      billableAmount: number | null;
    }>
  > {
    const milestoneWhere: { projectId?: string } = {};
    if (projectId) milestoneWhere.projectId = projectId;

    let milestones = await this.prismaRead.milestone.findMany({
      where: milestoneWhere,
      orderBy: [{ projectId: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        projectId: true,
        name: true,
        amount: true,
        percentage: true,
        order: true,
        status: true,
        createdAt: true,
        project: { select: { id: true, title: true } },
      },
    });

    if (milestones.length === 0) return [];

    // NL-DEL-002 / DEL-003: heal PENDING|IN_PROGRESS|REVIEW|COMPLETED milestones
    // whose deliverables are already all approved.
    const cascadeEligible = new Set(['PENDING', 'IN_PROGRESS', 'REVIEW', 'COMPLETED']);
    const candidateIds = milestones
      .filter((m) => cascadeEligible.has(String(m.status).toUpperCase()))
      .map((m) => m.id);
    if (candidateIds.length > 0) {
      const openRows = await this.prismaWrite.deliverable.findMany({
        where: {
          milestoneId: { in: candidateIds },
          status: { in: [...OPEN_DELIVERABLE_STATUSES] },
        },
        select: { milestoneId: true },
      });
      const openSet = new Set(openRows.map((r) => r.milestoneId));
      const anyRows = await this.prismaWrite.deliverable.findMany({
        where: { milestoneId: { in: candidateIds } },
        select: { milestoneId: true },
      });
      const anySet = new Set(anyRows.map((r) => r.milestoneId));
      const healIds = candidateIds.filter((id) => anySet.has(id) && !openSet.has(id));
      if (healIds.length > 0) {
        const now = new Date();
        await this.prismaWrite.milestone.updateMany({
          where: {
            id: { in: healIds },
            status: { in: ['PENDING', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'] },
          },
          data: { status: 'APPROVED', approvedAt: now, completedAt: now },
        });
        const healed = new Set(healIds);
        milestones = milestones.map((m) =>
          healed.has(m.id)
            ? { ...m, status: 'APPROVED', approvedAt: now, completedAt: now }
            : m,
        );
      }
    }

    const projectIds = [...new Set(milestones.map((m) => m.projectId))];
    const projectsWithQuotes = await this.prismaRead.project.findMany({
      where: { id: { in: projectIds } },
      select: {
        id: true,
        quote: { select: { paymentSchedule: true } },
      },
    });
    const scheduleLabelsByProject = new Map(
      projectsWithQuotes.map((p) => [p.id, extractScheduleLabelSet(p.quote?.paymentSchedule)]),
    );

    // NL-BUG-PAY-002: strip monetary amounts from delivery/work milestones when the
    // project already has payment-schedule (billable) rows — prevents 2× contract totals.
    {
      const byProjectHeal = new Map<string, typeof milestones>();
      for (const m of milestones) {
        if (!byProjectHeal.has(m.projectId)) byProjectHeal.set(m.projectId, []);
        byProjectHeal.get(m.projectId)!.push(m);
      }
      const zeroIds: string[] = [];
      for (const [pid, rows] of byProjectHeal) {
        const labels = scheduleLabelsByProject.get(pid);
        const hasScheduleMoney = rows.some(
          (m) => (m.amount ?? 0) > 0 && isPaymentScheduleMilestone(m, labels),
        );
        if (!hasScheduleMoney) continue;
        for (const m of rows) {
          if (!isPaymentScheduleMilestone(m, labels) && (m.amount ?? 0) > 0) {
            zeroIds.push(m.id);
          }
        }
      }
      if (zeroIds.length > 0) {
        await this.prismaWrite.milestone.updateMany({
          where: { id: { in: zeroIds } },
          data: { amount: 0, percentage: 0 },
        });
        const zeroed = new Set(zeroIds);
        milestones = milestones.map((m) =>
          zeroed.has(m.id) ? { ...m, amount: 0, percentage: 0 } : m,
        );
      }
    }

    const milestoneIds = milestones.map((m) => m.id);
    const payments = await this.prismaRead.payment.findMany({
      where: { milestoneId: { in: milestoneIds } },
      select: {
        id: true,
        milestoneId: true,
        projectId: true,
        amount: true,
        status: true,
        paymentRequestedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const paymentsByMilestone = new Map<
      string,
      {
        totalAmount: number;
        paymentsCount: number;
        latestPaymentId: string | null;
        latestStatus: string | null;
        paymentRequestedAt: Date | null;
      }
    >();

    for (const p of payments) {
      // Zero-amount rows are not billable and must not inflate counts on delivery milestones.
      if ((p.amount ?? 0) <= 0) continue;
      const mid = p.milestoneId!;
      if (!paymentsByMilestone.has(mid)) {
        paymentsByMilestone.set(mid, {
          totalAmount: 0,
          paymentsCount: 0,
          latestPaymentId: p.id,
          latestStatus: p.status,
          paymentRequestedAt: p.paymentRequestedAt,
        });
      }
      const entry = paymentsByMilestone.get(mid)!;
      entry.totalAmount += p.amount;
      entry.paymentsCount += 1;
    }

    const depositByProject = new Map<string, string | null>();
    const byProject = new Map<string, typeof milestones>();
    for (const m of milestones) {
      if (!byProject.has(m.projectId)) byProject.set(m.projectId, []);
      byProject.get(m.projectId)!.push(m);
    }
    for (const [pid, rows] of byProject) {
      const withPay = rows
        .filter((m) => (paymentsByMilestone.get(m.id)?.paymentsCount ?? 0) > 0)
        .map((m) => m.id);
      depositByProject.set(pid, pickDepositMilestoneId(rows, withPay));
    }

    return milestones.map((m) => {
      const pay = paymentsByMilestone.get(m.id);
      const projectRows = byProject.get(m.projectId) ?? [];
      const depositId = depositByProject.get(m.projectId) ?? null;
      const scheduleLabels = scheduleLabelsByProject.get(m.projectId);
      const payOnly = isPayOnlyMilestone(m, projectRows, depositId, scheduleLabels);

      let latestPaymentId = pay?.latestPaymentId ?? null;
      let latestStatus = pay?.latestStatus ?? null;
      let paymentRequestedAt = pay?.paymentRequestedAt?.toISOString() ?? null;
      let paymentsCount = pay?.paymentsCount ?? 0;
      let linkedInstallmentId: string | null = null;
      let linkedInstallmentName: string | null = null;
      let linkedInstallmentInclusive = false;
      let billableAmount: number | null = payOnly || Boolean(pay) ? (m.amount ?? null) : null;

      if (!pay && !payOnly) {
        const linked = resolveLinkedInstallmentResolution(
          m,
          projectRows,
          depositId,
          scheduleLabels,
        );
        if (linked) {
          const linkedPay = paymentsByMilestone.get(linked.installment.id);
          linkedInstallmentId = linked.installment.id;
          linkedInstallmentName = linked.installment.name ?? null;
          linkedInstallmentInclusive = linked.inclusive;
          const linkedRow = projectRows.find((row) => row.id === linked.installment.id);
          billableAmount = typeof linkedRow?.amount === 'number' ? linkedRow.amount : null;
          if (linkedPay && (m.amount ?? 0) > 0) {
            latestPaymentId = linkedPay.latestPaymentId;
            latestStatus = linkedPay.latestStatus;
            paymentRequestedAt = linkedPay.paymentRequestedAt?.toISOString() ?? null;
            paymentsCount = linkedPay.paymentsCount;
          }
        }
      }

      // Delivery-only (₹0) milestones must not inherit a linked installment's payment row.
      const nonBillableDelivery = (m.amount ?? 0) <= 0 && !payOnly;
      if (nonBillableDelivery) {
        paymentsCount = 0;
        latestStatus = null;
        latestPaymentId = null;
        paymentRequestedAt = null;
      }

      return {
        id: m.id,
        milestoneId: m.id,
        projectId: m.projectId,
        projectTitle: m.project.title,
        project: { id: m.project.id, title: m.project.title },
        name: m.name,
        type: payOnly || (m.amount ?? 0) > 0 ? 'payment' : 'delivery',
        amount: m.amount,
        order: m.order,
        status: m.status,
        totalAmount: nonBillableDelivery ? 0 : (pay?.totalAmount ?? m.amount ?? 0),
        paymentsCount,
        latestPaymentId,
        latestStatus,
        paymentRequestedAt,
        isDeposit: depositId === m.id,
        isPayOnly: payOnly,
        linkedInstallmentId,
        linkedInstallmentName,
        linkedInstallmentInclusive,
        billableAmount,
      };
    });
  }

  async getMilestoneById(
    milestoneId: string,
  ): Promise<{ milestoneId: string; payments: any[]; totalAmount: number } | null> {
    const payments = await this.prismaRead.payment.findMany({
      where: { milestoneId },
      orderBy: { createdAt: 'desc' },
    });
    if (!payments.length) return null;
    const totalAmount = payments.reduce((s, p) => s + (p as any).amount, 0);
    return { milestoneId, payments, totalAmount };
  }

  async getPaymentsByMilestone(milestoneId: string): Promise<any[]> {
    return this.prismaRead.payment.findMany({
      where: { milestoneId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMilestonePaymentStatus(milestoneId: string) {
    const payments = await this.prismaRead.payment.findMany({
      where: { milestoneId },
      select: { amount: true, status: true, amountRefunded: true },
    });

    const totalPaid = payments
      .filter((p) => p.status === 'COMPLETED' || p.status === 'REFUNDED')
      .reduce((sum, p) => sum + p.amount - p.amountRefunded, 0);

    return { milestoneId, totalPaid, paymentsCount: payments.length };
  }
}
