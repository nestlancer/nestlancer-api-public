import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import {
  isPayOnlyMilestone,
  pickDepositMilestoneId,
  pickDepositIdFromContext,
  resolveMilestoneClientAccess,
  extractScheduleLabelSet,
  sanitizeClientPaymentNotes,
  CURRENCY_SUBUNIT_MULTIPLIER,
  BusinessLogicException,
  type PaymentSnapshot,
} from '@nestlancer/common';
import { QueryPaymentsDto } from '../dto/query-payments.dto';

@Injectable()
export class PaymentsService {
  /** Throttle write-on-read heal so list/stats GETs do not scan+update on every hit. */
  private readonly lastHealAt = new Map<string, number>();
  private static readonly HEAL_TTL_MS = 5 * 60_000;

  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  /**
   * NL-PAY-014: repair payment rows where amount was stored as rupees instead of paise
   * (classic 100× understatement vs milestone schedule amount).
   */
  private async healMajorUnitsPaymentAmounts(scope?: {
    projectId?: string;
    clientId?: string;
  }): Promise<void> {
    const key = scope?.clientId || scope?.projectId || '*';
    const now = Date.now();
    const last = this.lastHealAt.get(key);
    if (last != null && now - last < PaymentsService.HEAL_TTL_MS) {
      return;
    }
    this.lastHealAt.set(key, now);

    const where: Record<string, unknown> = {
      milestoneId: { not: null },
      amount: { gt: 0 },
    };
    if (scope?.projectId) where.projectId = scope.projectId;
    if (scope?.clientId) where.clientId = scope.clientId;

    const rows = await this.prismaWrite.payment.findMany({
      where,
      select: {
        id: true,
        amount: true,
        milestone: { select: { amount: true } },
      },
      take: 200,
    });

    for (const row of rows) {
      const schedule = row.milestone?.amount ?? 0;
      if (
        schedule > 0 &&
        row.amount > 0 &&
        row.amount < schedule &&
        row.amount * CURRENCY_SUBUNIT_MULTIPLIER === schedule
      ) {
        await this.prismaWrite.payment.update({
          where: { id: row.id },
          data: { amount: schedule },
        });
      }
    }
  }

  async getMyPayments(
    userId: string,
    query: QueryPaymentsDto,
  ): Promise<{
    items: any[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    await this.healMajorUnitsPaymentAmounts({
      clientId: userId,
      projectId: query.projectId,
    });

    const { page = 1, status, projectId } = query;
    const limit = query.limit ?? query.pageSize ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { clientId: userId };
    // Client "pending" / "not due" use canPay (NL-PAY-004/007/008):
    // load open schedule rows, then filter with the same rules as the hub.
    const pendingDueFilter = status === 'PENDING';
    const notDueFilter = status === 'NOT_DUE';
    if (pendingDueFilter || notDueFilter) {
      where.status = {
        in: ['CREATED', 'PENDING', 'PROCESSING', 'PENDING_VERIFICATION'],
      };
    } else if (status) {
      where.status = status;
    }
    if (projectId) where.projectId = projectId;

    // Due / not-due need in-memory canPay filtering before pagination.
    if (pendingDueFilter || notDueFilter) {
      const candidates = await this.prismaRead.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          project: { select: { id: true, title: true } },
          milestone: { select: { id: true, name: true } },
        },
      });
      const annotated = await this.annotateClientPaymentsWithCanPay(userId, candidates);
      const filtered = annotated.filter((p) =>
        pendingDueFilter ? p.canPay === true : p.canPay === false,
      );
      const total = filtered.length;
      const items = filtered.slice(skip, skip + limit);
      return {
        items,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 0,
        },
      };
    }

    const [rawItems, total] = await Promise.all([
      this.prismaRead.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          project: { select: { id: true, title: true } },
          milestone: { select: { id: true, name: true } },
        },
      }),
      this.prismaRead.payment.count({ where }),
    ]);

    const items = await this.annotateClientPaymentsWithCanPay(userId, rawItems);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Attach `canPay` using the same milestone-sequence rules as the hub and
   * create-intent (NL-PAY-007). Payments without a milestone stay payable when open.
   */
  async annotateClientPaymentsWithCanPay<
    T extends {
      id: string;
      projectId: string;
      milestoneId?: string | null;
      status: string;
      paymentRequestedAt?: Date | string | null;
    },
  >(userId: string, items: T[]): Promise<Array<T & { canPay: boolean }>> {
    if (items.length === 0) return [];

    const projectIds = [...new Set(items.map((p) => p.projectId).filter(Boolean))];
    const [milestones, projectPayments] = await Promise.all([
      this.prismaRead.milestone.findMany({
        where: { projectId: { in: projectIds } },
        select: {
          id: true,
          projectId: true,
          name: true,
          order: true,
          createdAt: true,
          status: true,
        },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prismaRead.payment.findMany({
        where: { clientId: userId, projectId: { in: projectIds }, milestoneId: { not: null } },
        select: {
          projectId: true,
          milestoneId: true,
          status: true,
          paymentRequestedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const milestonesByProject = new Map<string, typeof milestones>();
    for (const m of milestones) {
      const list = milestonesByProject.get(m.projectId) ?? [];
      list.push(m);
      milestonesByProject.set(m.projectId, list);
    }

    const paymentsByProject = new Map<string, PaymentSnapshot[]>();
    for (const p of projectPayments) {
      if (!p.milestoneId) continue;
      const list = paymentsByProject.get(p.projectId) ?? [];
      list.push({
        milestoneId: p.milestoneId,
        status: p.status,
        paymentRequestedAt: p.paymentRequestedAt,
      });
      paymentsByProject.set(p.projectId, list);
    }

    const openStatuses = new Set([
      'CREATED',
      'PENDING',
      'PROCESSING',
      'PENDING_VERIFICATION',
      'FAILED',
    ]);

    return items.map((item) => {
      const statusUpper = String(item.status || '').toUpperCase();
      if (!openStatuses.has(statusUpper)) {
        return { ...item, canPay: false };
      }
      if (!item.milestoneId) {
        return { ...item, canPay: true };
      }

      const projectMilestones = milestonesByProject.get(item.projectId) ?? [];
      const snapshots = paymentsByProject.get(item.projectId) ?? [];
      const depositId = pickDepositIdFromContext(projectMilestones, snapshots);
      const access = resolveMilestoneClientAccess(
        item.milestoneId,
        projectMilestones,
        snapshots,
        depositId,
      );
      return { ...item, canPay: access.canPay };
    });
  }

  /** NL-PAY-009/010: invoices are client-visible when paid/in-flight or the installment is due. */
  isClientInvoiceVisible(payment: { status?: string; canPay?: boolean }): boolean {
    const status = String(payment.status || '').toUpperCase();
    const alwaysAllowed = new Set([
      'COMPLETED',
      'REFUNDED',
      'DISPUTED',
      'PENDING_VERIFICATION',
      'PROCESSING',
    ]);
    if (alwaysAllowed.has(status)) return true;
    return payment.canPay === true;
  }

  async getPaymentById(userId: string, id: string): Promise<any> {
    const payment = await this.prismaRead.payment.findFirst({
      where: { id, clientId: userId },
      include: {
        refunds: true,
        proofs: { select: { id: true, mediaId: true, createdAt: true } },
        project: { select: { id: true, title: true } },
        milestone: { select: { id: true, name: true, status: true } },
        platformAccount: {
          select: {
            id: true,
            label: true,
            type: true,
            bankName: true,
            accountNumber: true,
            ifsc: true,
            upiVpa: true,
          },
        },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    const [annotated] = await this.annotateClientPaymentsWithCanPay(userId, [payment]);
    const row = annotated ?? { ...payment, canPay: false };
    return { ...row, customNotes: sanitizeClientPaymentNotes(payment.customNotes) };
  }

  /** Get payment milestones for a project (user-facing). Includes latest payment id/status per milestone. */
  async getProjectMilestones(userId: string, projectId: string) {
    const project = await this.prismaRead.project.findFirst({
      where: { id: projectId, clientId: userId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const milestones = await this.prismaRead.milestone.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        amount: true,
        percentage: true,
        order: true,
        status: true,
        createdAt: true,
      },
    });

    const projectWithQuote = await this.prismaRead.project.findUnique({
      where: { id: projectId },
      select: { quote: { select: { paymentSchedule: true } } },
    });
    const scheduleLabels = extractScheduleLabelSet(projectWithQuote?.quote?.paymentSchedule);

    const payments = await this.prismaRead.payment.findMany({
      where: { projectId, clientId: userId },
      orderBy: { createdAt: 'desc' },
    });

    const paymentsByMilestone = new Map<string, typeof payments>();
    for (const payment of payments) {
      const milestoneId = payment.milestoneId;
      if (!milestoneId) continue;
      if (!paymentsByMilestone.has(milestoneId)) {
        paymentsByMilestone.set(milestoneId, []);
      }
      paymentsByMilestone.get(milestoneId)!.push(payment);
    }

    const depositId = pickDepositMilestoneId(milestones, [...paymentsByMilestone.keys()]);

    const paymentSnapshots: PaymentSnapshot[] = payments
      .filter((p) => p.milestoneId)
      .map((p) => ({
        milestoneId: p.milestoneId as string,
        status: p.status,
        paymentRequestedAt: p.paymentRequestedAt,
      }));

    const milestoneRows = milestones.map((m) => ({
      id: m.id,
      order: m.order,
      createdAt: m.createdAt,
      name: m.name,
      status: m.status,
    }));

    return {
      projectId,
      milestones: milestones.map((milestone) => {
        const milestonePayments = paymentsByMilestone.get(milestone.id) ?? [];
        const latestPayment = milestonePayments[0];
        const access = resolveMilestoneClientAccess(
          milestone.id,
          milestoneRows,
          paymentSnapshots,
          depositId,
        );
        return {
          id: milestone.id,
          milestoneId: milestone.id,
          name: milestone.name,
          title: milestone.name,
          amount: milestone.amount,
          order: milestone.order,
          status: milestone.status,
          latestPaymentId: latestPayment?.id ?? null,
          latestStatus: latestPayment?.status ?? null,
          paymentRequestedAt: latestPayment?.paymentRequestedAt?.toISOString() ?? null,
          paymentsCount: milestonePayments.length,
          totalAmount: milestonePayments.reduce((sum, payment) => sum + payment.amount, 0),
          isDeposit: depositId === milestone.id,
          isPayOnly: isPayOnlyMilestone(milestone, milestones, depositId, scheduleLabels),
          isLocked: access.isLocked,
          lockReason: access.lockReason ?? null,
          canPay: access.canPay,
          canReviewDelivery: access.canReviewDelivery,
          canRequestPrePaymentRevision: access.canRequestPrePaymentRevision,
          isPaidAndLocked: access.isPaidAndLocked,
        };
      }),
    };
  }

  async getAdminPayments(query: QueryPaymentsDto): Promise<{
    items: any[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    await this.healMajorUnitsPaymentAmounts({
      projectId: query.projectId,
      clientId: query.clientId,
    });

    const { page = 1, status, projectId, clientId } = query;
    const limit = query.limit ?? query.pageSize ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (projectId) where.projectId = projectId;
    if (clientId) where.clientId = clientId;

    const [items, total] = await Promise.all([
      this.prismaRead.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, email: true, firstName: true, lastName: true } },
          project: { select: { id: true, title: true } },
          milestone: { select: { id: true, name: true } },
          proofs: { select: { id: true, mediaId: true, createdAt: true } },
          platformAccount: {
            select: { id: true, label: true, type: true, upiVpa: true, accountNumber: true },
          },
        },
      }),
      this.prismaRead.payment.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserPaymentStats(userId: string) {
    await this.healMajorUnitsPaymentAmounts({ clientId: userId });

    // Scale: aggregate completed/disputed totals; only load open rows for canPay annotation.
    const [completedAgg, disputedAgg, openPayments, totalPayments] = await Promise.all([
      this.prismaRead.payment.aggregate({
        where: { clientId: userId, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      this.prismaRead.payment.aggregate({
        where: { clientId: userId, status: 'DISPUTED' },
        _sum: { amount: true },
      }),
      this.prismaRead.payment.findMany({
        where: {
          clientId: userId,
          status: { in: ['CREATED', 'PENDING', 'PROCESSING', 'PENDING_VERIFICATION'] },
        },
        select: {
          id: true,
          status: true,
          amount: true,
          projectId: true,
          milestoneId: true,
          paymentRequestedAt: true,
        },
      }),
      this.prismaRead.payment.count({ where: { clientId: userId } }),
    ]);

    const annotated = await this.annotateClientPaymentsWithCanPay(userId, openPayments);

    let pending = 0;
    for (const p of annotated) {
      const amount = Number(p.amount) || 0;
      // NL-PAY-007: Pending KPI only counts installments that are actually due
      // (same canPay rules as milestone hub / create-intent).
      if (
        p.canPay &&
        (p.status === 'CREATED' ||
          p.status === 'PENDING' ||
          p.status === 'PROCESSING' ||
          p.status === 'PENDING_VERIFICATION')
      ) {
        pending += amount;
      }
    }

    return {
      totalSpent: Number(completedAgg._sum.amount ?? 0),
      pending,
      inDispute: Number(disputedAgg._sum.amount ?? 0),
      totalPayments,
    };
  }

  async fileDispute(userId: string, id: string, body: any) {
    const payment = await this.prismaRead.payment.findFirst({
      where: { id, clientId: userId },
    });

    if (!payment) throw new NotFoundException('Payment not found');

    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    if (reason.length < 8) {
      throw new BadRequestException('A dispute reason of at least 8 characters is required');
    }

    // Prefer the specific "already open" code over the status gate when payment is
    // already DISPUTED (status !== COMPLETED would otherwise mask this as GATE_020).
    const existingOpen = await this.prismaRead.dispute.findFirst({
      where: { paymentId: id, status: 'OPEN' },
      select: { id: true },
    });
    if (existingOpen) {
      throw new BusinessLogicException(
        'An open dispute already exists for this payment',
        'PAYMENT_GATE_021',
        { paymentId: id, disputeId: existingOpen.id },
      );
    }

    // NL-BUG-DISP-001: clients must not unilaterally flip COMPLETED → DISPUTED.
    // Real chargebacks arrive via Razorpay `dispute.created` webhook. A client
    // POST is only accepted when it carries a gateway dispute id (disp_…).
    const gatewayDisputeId =
      (typeof body?.gatewayDisputeId === 'string' && body.gatewayDisputeId.trim()) ||
      (typeof body?.externalDisputeId === 'string' && body.externalDisputeId.trim()) ||
      '';
    const hasGatewayEvidence = /^disp_[A-Za-z0-9]+$/.test(gatewayDisputeId);

    if (payment.status !== 'COMPLETED') {
      throw new BusinessLogicException(
        'Only completed payments can be disputed',
        'PAYMENT_GATE_020',
        { paymentId: id, status: payment.status },
      );
    }

    if (!hasGatewayEvidence) {
      throw new BusinessLogicException(
        'Completed payments require a gateway dispute id to file a dispute',
        'PAYMENT_GATE_020',
        { paymentId: id, status: payment.status },
      );
    }

    const dispute = await this.prismaWrite.$transaction(async (tx: any) => {
      const d = await tx.dispute.create({
        data: {
          paymentId: id,
          reason,
          description: typeof body?.description === 'string' ? body.description : '',
          status: 'OPEN',
          filedBy: userId,
          amount: payment.amount,
          currency: payment.currency,
          externalId: gatewayDisputeId,
        } as any,
      });

      // Mark payment disputed for workflow, but keep paidAt so revenue accounting
      // still treats the capture as collected until a refund resolves the dispute.
      await tx.payment.update({
        where: { id },
        data: { status: 'DISPUTED' },
      });

      await tx.project.update({
        where: { id: payment.projectId },
        data: { status: 'DISPUTED' },
      });

      await tx.outbox.create({
        data: {
          type: 'PAYMENT_DISPUTED',
          payload: {
            paymentId: id,
            disputeId: d.id,
            userId,
            projectId: payment.projectId,
            reason,
          },
        },
      });

      return d;
    });

    return {
      id: dispute.id,
      paymentId: id,
      status: 'disputed',
      reason,
      filedAt: dispute.createdAt,
    };
  }

  async cancelPaymentAsAdmin(id: string) {
    const payment = await this.prismaRead.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'PENDING' && payment.status !== 'CREATED') {
      throw new BadRequestException('Only pending or created payments can be cancelled');
    }
    const updated = await this.prismaWrite.payment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    return {
      id: updated.id,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
    };
  }

  async cancelPayment(userId: string, id: string) {
    const payment = await this.prismaRead.payment.findFirst({
      where: { id, clientId: userId },
    });

    if (!payment) throw new NotFoundException('Payment not found');

    if (payment.status !== 'PENDING' && payment.status !== 'CREATED') {
      throw new BusinessLogicException(
        'Only pending or created payments can be cancelled',
        'PAYMENT_GATE_003',
      );
    }

    const updated = await this.prismaWrite.payment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return {
      id: updated.id,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
    };
  }
}
