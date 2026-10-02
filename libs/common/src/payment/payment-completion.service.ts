import { Injectable } from '@nestjs/common';
import { PrismaWriteService } from '@nestlancer/database';

import { PaymentStatus } from '../enums/payment-status.enum';
import { writeAuditLog } from '../utils/audit-log.util';
import {
  isPayOnlyMilestone,
  isPaymentScheduleMilestone,
  pickDepositMilestoneId,
} from './deposit-milestone.util';

const PROJECT_STATUS_PENDING_PAYMENT = 'PENDING_PAYMENT';
const PROJECT_STATUS_IN_PROGRESS = 'IN_PROGRESS';
const PROJECT_STATUS_PAYMENT_OVERDUE = 'PAYMENT_OVERDUE';
const PROJECT_STATUS_SUSPENDED = 'SUSPENDED';

const REVISION_OVERFLOW_PREFIX = 'REVISION_OVERFLOW:';

export type PaymentCompletionContext = {
  paymentId: string;
  projectId: string;
  milestoneId?: string | null;
  amount: number;
  currency: string;
  clientId?: string;
  clientEmail?: string;
  clientName?: string;
  projectTitle?: string;
  source?: string;
  adminId?: string;
};

type TxClient = {
  payment: {
    update: (args: unknown) => Promise<{
      id: string;
      projectId: string;
      milestoneId: string | null;
      amount: number;
      currency: string;
    }>;
    count: (args: unknown) => Promise<number>;
  };
  milestone: {
    findUnique: (args: unknown) => Promise<{ id: string; status: string } | null>;
    update: (args: unknown) => Promise<unknown>;
  };
  project: {
    findUnique: (args: unknown) => Promise<{ id: string; status: string } | null>;
    update: (args: unknown) => Promise<unknown>;
  };
  outbox: { create: (args: unknown) => Promise<unknown> };
  auditLog: { create: (args: unknown) => Promise<unknown> };
};

/**
 * Shared payment completion side-effects used by Razorpay confirm, webhooks, and manual admin entry.
 */
@Injectable()
export class PaymentCompletionService {
  constructor(private readonly prismaWrite: PrismaWriteService) {}

  /**
   * Run lifecycle side-effects for a payment already marked COMPLETED.
   */
  async finalizeExistingPayment(ctx: PaymentCompletionContext): Promise<void> {
    const apiBase = process.env.API_PUBLIC_URL || 'https://api.nestlancer.com/api/v1';
    const isManual = ctx.source === 'manual';

    await this.prismaWrite.$transaction(
      async (tx: any) => {
        const payment = {
          id: ctx.paymentId,
          projectId: ctx.projectId,
          milestoneId: ctx.milestoneId ?? null,
        };

        await this.activateMilestoneAfterPayment(tx, payment);
        await this.reconcilePaidScheduleMilestones(tx, ctx.projectId);
        await this.syncProjectOverallProgress(tx, ctx.projectId);
        await this.activateProjectIfFirstPayment(tx, payment);
        await this.restoreProjectIfOverduePayment(tx, payment, ctx);
        await this.applyRevisionOverflowIfNeeded(tx, ctx);

        await tx.outbox.create({
          data: {
            type: 'PAYMENT_COMPLETED',
            aggregateType: 'PAYMENT',
            aggregateId: ctx.paymentId,
            payload: {
              paymentId: ctx.paymentId,
              projectId: ctx.projectId,
              milestoneId: ctx.milestoneId,
              amount: ctx.amount,
              currency: ctx.currency,
              clientId: ctx.clientId,
              clientEmail: ctx.clientEmail,
              clientName: ctx.clientName,
              projectTitle: ctx.projectTitle,
              receiptLink: `${apiBase}/payments/${ctx.paymentId}/receipt`,
              source: ctx.source ?? 'online',
              adminId: ctx.adminId,
              manual: isManual,
            },
          },
        });

        if (isManual) {
          await tx.outbox.create({
            data: {
              type: 'MANUAL_PAYMENT_CREATED',
              aggregateType: 'PAYMENT',
              aggregateId: ctx.paymentId,
              payload: {
                paymentId: ctx.paymentId,
                clientId: ctx.clientId,
                userId: ctx.clientId,
                projectId: ctx.projectId,
                projectTitle: ctx.projectTitle,
                amount: ctx.amount,
                currency: ctx.currency,
                manual: true,
                adminId: ctx.adminId,
              },
            },
          });
        }

        await writeAuditLog(tx, {
          userId: ctx.clientId ?? ctx.adminId,
          action: 'PAYMENT_COMPLETED',
          category: 'payment',
          description: `Payment ${ctx.paymentId} completed`,
          resourceType: 'PAYMENT',
          resourceId: ctx.paymentId,
          metadata: { source: ctx.source, projectId: ctx.projectId },
        });
      },
      { maxWait: 10_000, timeout: 20_000 },
    );
  }

  /**
   * Idempotent repair for projects where payments completed but schedule milestones lag.
   */
  async reconcileProjectPaymentState(projectId: string): Promise<void> {
    await this.prismaWrite.$transaction(
      async (tx: any) => {
        await this.reconcilePaidScheduleMilestones(tx, projectId);
        await this.syncProjectOverallProgress(tx, projectId);
      },
      { maxWait: 10_000, timeout: 20_000 },
    );
  }

  private async activateMilestoneAfterPayment(
    tx: any,
    payment: { milestoneId: string | null; projectId: string },
  ): Promise<void> {
    if (!payment.milestoneId) return;

    const milestone = await tx.milestone.findUnique({
      where: { id: payment.milestoneId },
      select: { id: true, status: true },
    });

    if (!milestone) return;

    const projectMilestones = await tx.milestone.findMany({
      where: { projectId: payment.projectId },
      select: { id: true, name: true, order: true, createdAt: true, percentage: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    const paymentRows = await tx.payment.findMany({
      where: { projectId: payment.projectId, milestoneId: { not: null } },
      select: { milestoneId: true },
      distinct: ['milestoneId'],
    });
    const withPay = paymentRows
      .map((p: { milestoneId: string | null }) => p.milestoneId)
      .filter((id: string | null): id is string => typeof id === 'string');
    const depositId = pickDepositMilestoneId(projectMilestones, withPay);
    const isDeposit = depositId === payment.milestoneId;
    const milestoneRow = projectMilestones.find(
      (m: { id: string }) => m.id === payment.milestoneId,
    );
    const payOnly =
      milestoneRow != null && isPayOnlyMilestone(milestoneRow, projectMilestones, depositId);
    const scheduleMilestone =
      milestoneRow != null && isPaymentScheduleMilestone(milestoneRow);

    // NL-BUG-MS-003 / ADR 001: payment must not set delivery status to APPROVED.
    // Pay-only / schedule rows stay PENDING; "paid" is Payment.status === COMPLETED
    // (exposed as latestStatus on milestone payment lists).
    if (isDeposit || payOnly || scheduleMilestone) {
      return;
    }

    // Delivery milestones: payment unlocks work when still PENDING.
    if (milestone.status !== 'PENDING') return;

    await tx.milestone.update({
      where: { id: payment.milestoneId },
      data: { status: 'IN_PROGRESS' },
    });
  }

  /**
   * Idempotent repair hook for projects where payments completed.
   * Intentionally does not flip schedule/pay-only milestones to APPROVED (NL-BUG-MS-003).
   * Kept so finalizeExistingPayment / reconcileProjectPaymentState share one call site.
   */
  private async reconcilePaidScheduleMilestones(_tx: any, _projectId: string): Promise<void> {
    // no-op — payment completion is orthogonal to delivery approval
  }

  private async syncProjectOverallProgress(tx: any, projectId: string): Promise<void> {
    const [project, milestones] = await Promise.all([
      tx.project.findUnique({ where: { id: projectId }, select: { status: true } }),
      tx.milestone.findMany({ where: { projectId }, select: { status: true } }),
    ]);
    if (!project || milestones.length === 0) return;

    if (project.status === 'COMPLETED') {
      await tx.project.update({
        where: { id: projectId },
        data: { overallProgress: 100 },
      });
      return;
    }

    const completedStatuses = new Set(['COMPLETED', 'REVIEW', 'APPROVED']);
    const completed = milestones.filter((m: { status: string }) =>
      completedStatuses.has(m.status),
    ).length;
    const overallProgress = Math.round((completed / milestones.length) * 100);

    await tx.project.update({
      where: { id: projectId },
      data: { overallProgress },
    });
  }

  private async activateProjectIfFirstPayment(
    tx: TxClient,
    payment: { id: string; projectId: string },
  ): Promise<void> {
    const project = await tx.project.findUnique({
      where: { id: payment.projectId },
      select: { id: true, status: true },
    });

    if (!project || project.status !== PROJECT_STATUS_PENDING_PAYMENT) return;

    const completedPayments = await tx.payment.count({
      where: { projectId: payment.projectId, status: PaymentStatus.COMPLETED },
    });

    if (completedPayments < 1) return;

    await tx.project.update({
      where: { id: payment.projectId },
      data: { status: PROJECT_STATUS_IN_PROGRESS },
    });

    await tx.outbox.create({
      data: {
        type: 'PROJECT_STATUS_CHANGED',
        payload: {
          projectId: payment.projectId,
          previousStatus: PROJECT_STATUS_PENDING_PAYMENT,
          status: PROJECT_STATUS_IN_PROGRESS,
          reason: 'payment_completed',
          paymentId: payment.id,
        },
      },
    });
  }

  /** Restore project after overdue payment while SUSPENDED or PAYMENT_OVERDUE. */
  private async restoreProjectIfOverduePayment(
    tx: TxClient,
    payment: { id: string; projectId: string },
    ctx: PaymentCompletionContext,
  ): Promise<void> {
    const project = await tx.project.findUnique({
      where: { id: payment.projectId },
      select: { id: true, status: true },
    });

    if (
      !project ||
      (project.status !== PROJECT_STATUS_PAYMENT_OVERDUE &&
        project.status !== PROJECT_STATUS_SUSPENDED)
    ) {
      return;
    }

    const previousStatus = project.status;

    await tx.project.update({
      where: { id: payment.projectId },
      data: { status: PROJECT_STATUS_IN_PROGRESS },
    });

    await tx.outbox.create({
      data: {
        type: 'PROJECT_STATUS_CHANGED',
        payload: {
          projectId: payment.projectId,
          previousStatus,
          status: PROJECT_STATUS_IN_PROGRESS,
          reason: 'overdue_payment_completed',
          paymentId: payment.id,
        },
      },
    });

    await tx.outbox.create({
      data: {
        type: 'PROJECT_RESUMED',
        aggregateType: 'PROJECT',
        aggregateId: payment.projectId,
        payload: {
          projectId: payment.projectId,
          clientId: ctx.clientId,
          userId: ctx.clientId,
          previousStatus,
          status: PROJECT_STATUS_IN_PROGRESS,
          paymentId: payment.id,
        },
      },
    });
  }

  /** Apply milestone revision after paid overflow revision payment completes. */
  private async applyRevisionOverflowIfNeeded(
    tx: any,
    ctx: PaymentCompletionContext,
  ): Promise<void> {
    const record = await tx.payment.findUnique({
      where: { id: ctx.paymentId },
      select: { customNotes: true, milestoneId: true, projectId: true, clientId: true },
    });

    if (!record?.customNotes?.startsWith(REVISION_OVERFLOW_PREFIX) || !record.milestoneId) {
      return;
    }

    let payload: { reason?: string; userId?: string };
    try {
      payload = JSON.parse(record.customNotes.slice(REVISION_OVERFLOW_PREFIX.length));
    } catch {
      return;
    }

    const existing = await tx.milestone.findUnique({
      where: { id: record.milestoneId },
      select: { revisionCount: true, name: true },
    });
    if (!existing) return;

    const nextCount = (existing.revisionCount ?? 0) + 1;

    const ms = await tx.milestone.update({
      where: { id: record.milestoneId },
      data: {
        status: 'REVISION_REQUESTED',
        revisionCount: nextCount,
      },
    });

    await tx.progressEntry.create({
      data: {
        projectId: record.projectId,
        milestoneId: record.milestoneId,
        type: 'UPDATE',
        title: 'Revision Requested on Milestone (paid overflow)',
        description: payload.reason ?? 'Additional revision paid',
        actorId: payload.userId ?? record.clientId,
        visibility: 'CLIENT_VISIBLE',
      },
    });

    await tx.outbox.create({
      data: {
        type: 'MILESTONE_REVISION_REQUESTED',
        payload: {
          milestoneId: ms.id,
          projectId: ms.projectId,
          name: ms.name,
          requestedBy: payload.userId ?? record.clientId,
          reason: payload.reason,
          revisionCount: nextCount,
          paidOverflow: true,
        },
      },
    });
  }
}
