import { Injectable } from '@nestjs/common';
import { PrismaReadService } from '@nestlancer/database';
import { BusinessLogicException } from '@nestlancer/common';
import { PAYMENT_GATE_ERROR } from '@nestlancer/common';
import { PaymentStatus } from '@nestlancer/common';
import { isPayOnlyMilestone, pickDepositMilestoneId } from '@nestlancer/common';
import {
  pickDepositIdFromContext,
  resolveMilestoneClientAccess,
  type PaymentSnapshot,
} from '@nestlancer/common';

export type PaymentGateContext = {
  canPay: boolean;
  reason?: string;
  code?: string;
  isDeposit: boolean;
};

@Injectable()
export class PaymentGatingService {
  constructor(private readonly prismaRead: PrismaReadService) {}

  /** Resolve the deposit milestone id for a project (payment-schedule first item). */
  async getDepositMilestoneId(projectId: string): Promise<string | null> {
    const milestones = await this.prismaRead.milestone.findMany({
      where: { projectId },
      select: { id: true, order: true, createdAt: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    if (milestones.length === 0) return null;

    const payments = await this.prismaRead.payment.findMany({
      where: { projectId, milestoneId: { not: null } },
      select: { milestoneId: true },
      distinct: ['milestoneId'],
    });
    const withPay = payments
      .map((p) => p.milestoneId)
      .filter((id): id is string => typeof id === 'string');

    return pickDepositMilestoneId(milestones, withPay);
  }

  /** First payment-schedule milestone is treated as the deposit. */
  async isDepositMilestone(milestoneId: string, projectId: string): Promise<boolean> {
    const depositId = await this.getDepositMilestoneId(projectId);
    return depositId === milestoneId;
  }

  async isDepositPaid(projectId: string): Promise<boolean> {
    const depositMilestoneId = await this.getDepositMilestoneId(projectId);
    if (!depositMilestoneId) {
      const anyPaid = await this.prismaRead.payment.count({
        where: { projectId, status: PaymentStatus.COMPLETED },
      });
      return anyPaid > 0;
    }

    const paid = await this.prismaRead.payment.count({
      where: {
        projectId,
        milestoneId: depositMilestoneId,
        status: PaymentStatus.COMPLETED,
      },
    });
    return paid > 0;
  }

  async assertCanCreateIntent(
    clientId: string,
    projectId: string,
    milestoneId?: string,
  ): Promise<{ isDeposit: boolean }> {
    const project = await this.prismaRead.project.findUnique({
      where: { id: projectId },
      select: { id: true, clientId: true, status: true },
    });

    if (!project || project.clientId !== clientId) {
      throw new BusinessLogicException(
        'You do not have access to this project',
        PAYMENT_GATE_ERROR.PROJECT_ACCESS_DENIED,
      );
    }

    if (project.status === 'PENDING_CONTRACT') {
      throw new BusinessLogicException(
        'Sign the contract before making payments',
        PAYMENT_GATE_ERROR.CONTRACT_REQUIRED,
      );
    }

    if (!milestoneId) {
      const depositPaid = await this.isDepositPaid(projectId);
      if (!depositPaid && project.status === 'PENDING_PAYMENT') {
        throw new BusinessLogicException(
          'Pay the deposit milestone before other project payments',
          PAYMENT_GATE_ERROR.DEPOSIT_REQUIRED,
        );
      }
      return { isDeposit: false };
    }

    const milestone = await this.prismaRead.milestone.findFirst({
      where: { id: milestoneId, projectId },
    });
    if (!milestone) {
      throw new BusinessLogicException(
        'Milestone not found',
        PAYMENT_GATE_ERROR.MILESTONE_NOT_FOUND,
      );
    }

    const completed = await this.prismaRead.payment.findFirst({
      where: {
        projectId,
        milestoneId,
        status: PaymentStatus.COMPLETED,
      },
    });
    if (completed) {
      throw new BusinessLogicException(
        'This milestone is already paid',
        PAYMENT_GATE_ERROR.PAYMENT_ALREADY_COMPLETED,
      );
    }

    const isDeposit = await this.isDepositMilestone(milestoneId, projectId);

    if (isDeposit) {
      await this.assertMilestonePaymentAllowed(projectId, milestoneId);
      return { isDeposit: true };
    }

    if (milestone.status !== 'APPROVED') {
      const revisionOverflowPayment = await this.prismaRead.payment.findFirst({
        where: {
          milestoneId,
          projectId,
          status: { in: [PaymentStatus.CREATED, PaymentStatus.PENDING] },
          customNotes: { startsWith: 'REVISION_OVERFLOW:' },
        },
      });
      if (revisionOverflowPayment) {
        return { isDeposit: false };
      }

      const openAfterRequest = await this.prismaRead.payment.findFirst({
        where: {
          milestoneId,
          status: { in: [PaymentStatus.CREATED, PaymentStatus.PENDING] },
          paymentRequestedAt: { not: null },
        },
      });
      if (!openAfterRequest) {
        throw new BusinessLogicException(
          'Payment is available after you approve the milestone or when the studio requests payment',
          PAYMENT_GATE_ERROR.MILESTONE_NOT_APPROVED,
        );
      }
    }

    await this.assertMilestonePaymentAllowed(projectId, milestoneId);

    return { isDeposit: false };
  }

  private async assertMilestonePaymentAllowed(
    projectId: string,
    milestoneId: string,
  ): Promise<void> {
    const milestones = await this.prismaRead.milestone.findMany({
      where: { projectId },
      select: { id: true, name: true, order: true, createdAt: true, status: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    const payments = await this.prismaRead.payment.findMany({
      where: { projectId, milestoneId: { not: null } },
      select: { milestoneId: true, status: true, paymentRequestedAt: true },
      orderBy: { createdAt: 'desc' },
    });
    const paymentSnapshots: PaymentSnapshot[] = payments
      .filter((p) => p.milestoneId)
      .map((p) => ({
        milestoneId: p.milestoneId as string,
        status: p.status,
        paymentRequestedAt: p.paymentRequestedAt,
      }));
    const depositId = pickDepositIdFromContext(milestones, paymentSnapshots);
    const access = resolveMilestoneClientAccess(
      milestoneId,
      milestones,
      paymentSnapshots,
      depositId,
    );
    if (!access.canPay) {
      throw new BusinessLogicException(
        access.lockReason ??
          'This milestone payment is not available yet — complete earlier milestones first',
        access.isLocked
          ? PAYMENT_GATE_ERROR.MILESTONE_PHASE_LOCKED
          : PAYMENT_GATE_ERROR.UNPAID_MILESTONES,
      );
    }
  }

  private async assertMilestonePhaseUnlocked(
    projectId: string,
    milestoneId: string,
  ): Promise<void> {
    const milestones = await this.prismaRead.milestone.findMany({
      where: { projectId },
      select: { id: true, name: true, order: true, createdAt: true, status: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    const payments = await this.prismaRead.payment.findMany({
      where: { projectId, milestoneId: { not: null } },
      select: { milestoneId: true, status: true, paymentRequestedAt: true },
      orderBy: { createdAt: 'desc' },
    });
    const paymentSnapshots: PaymentSnapshot[] = payments
      .filter((p) => p.milestoneId)
      .map((p) => ({
        milestoneId: p.milestoneId as string,
        status: p.status,
        paymentRequestedAt: p.paymentRequestedAt,
      }));
    const depositId = pickDepositIdFromContext(milestones, paymentSnapshots);
    const access = resolveMilestoneClientAccess(
      milestoneId,
      milestones,
      paymentSnapshots,
      depositId,
    );
    if (access.isLocked) {
      throw new BusinessLogicException(
        access.lockReason ?? 'Complete earlier milestones before requesting payment on this one',
        PAYMENT_GATE_ERROR.MILESTONE_PHASE_LOCKED,
      );
    }
  }

  /** Load project milestones + deposit id for pay-only schedule detection. */
  async getPayOnlyContext(projectId: string): Promise<{
    milestones: Array<{ id: string; name: string | null }>;
    depositId: string | null;
  }> {
    const milestones = await this.prismaRead.milestone.findMany({
      where: { projectId },
      select: { id: true, name: true, order: true, createdAt: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    const payments = await this.prismaRead.payment.findMany({
      where: { projectId, milestoneId: { not: null } },
      select: { milestoneId: true },
      distinct: ['milestoneId'],
    });
    const withPay = payments
      .map((p) => p.milestoneId)
      .filter((id): id is string => typeof id === 'string');
    return {
      milestones,
      depositId: pickDepositMilestoneId(milestones, withPay),
    };
  }

  async isPayOnlyMilestone(milestoneId: string, projectId: string): Promise<boolean> {
    const { milestones, depositId } = await this.getPayOnlyContext(projectId);
    const milestone = milestones.find((m) => m.id === milestoneId);
    if (!milestone) return false;
    return isPayOnlyMilestone(milestone, milestones, depositId);
  }

  async assertCanRequestPayment(milestoneId: string): Promise<void> {
    const milestone = await this.prismaRead.milestone.findUnique({
      where: { id: milestoneId },
      include: { project: { select: { status: true } } },
    });
    if (!milestone) {
      throw new BusinessLogicException(
        'Milestone not found',
        PAYMENT_GATE_ERROR.MILESTONE_NOT_FOUND,
      );
    }

    const { milestones, depositId } = await this.getPayOnlyContext(milestone.projectId);
    const payOnly = isPayOnlyMilestone(milestone, milestones, depositId);

    // Deposit is collected upfront — never "request payment" on it.
    if (depositId === milestone.id) {
      throw new BusinessLogicException(
        'Deposit is paid upfront — request payment only applies to later milestones after client approval',
        PAYMENT_GATE_ERROR.DEPOSIT_DELIVERY_NOT_ALLOWED,
      );
    }

    const paid = await this.prismaRead.payment.findFirst({
      where: { milestoneId, status: PaymentStatus.COMPLETED },
    });
    if (paid) {
      throw new BusinessLogicException(
        'Milestone is already paid',
        PAYMENT_GATE_ERROR.PAYMENT_ALREADY_COMPLETED,
      );
    }

    // Dual-model Mid/Final (pay-only schedule): unlock after deposit is paid.
    // Delivery approval happens on work milestones; this row is the installment.
    if (payOnly) {
      const depositPaid = await this.isDepositPaid(milestone.projectId);
      if (!depositPaid) {
        throw new BusinessLogicException(
          'Pay the deposit before requesting later installment payments',
          PAYMENT_GATE_ERROR.DEPOSIT_REQUIRED,
        );
      }
      await this.assertMilestonePhaseUnlocked(milestone.projectId, milestoneId);
      return;
    }

    // Pure work milestones in dual model have no schedule payment row — nudge Mid/Final instead.
    const hasOpenOrAnyPayment = await this.prismaRead.payment.findFirst({
      where: { milestoneId },
      select: { id: true },
    });
    const hasPayOnlySiblings = milestones.some(
      (m) => m.id !== milestone.id && isPayOnlyMilestone(m, milestones, depositId),
    );
    if (!hasOpenOrAnyPayment && hasPayOnlySiblings) {
      throw new BusinessLogicException(
        'Request payment on the installment milestone (Mid-project / Final payment), not on this work milestone',
        PAYMENT_GATE_ERROR.MILESTONE_NOT_READY_FOR_PAYMENT_REQUEST,
      );
    }

    // Work milestones or schedule-as-work (no dedicated work rows): require approval first.
    if (milestone.status !== 'APPROVED') {
      throw new BusinessLogicException(
        'Request payment only after the client has approved this milestone',
        PAYMENT_GATE_ERROR.MILESTONE_NOT_READY_FOR_PAYMENT_REQUEST,
      );
    }
  }

  async assertCanCompleteDelivery(projectId: string): Promise<void> {
    const project = await this.prismaRead.project.findUnique({
      where: { id: projectId },
      select: { status: true },
    });
    if (project?.status === 'PENDING_PAYMENT') {
      const depositPaid = await this.isDepositPaid(projectId);
      if (!depositPaid) {
        throw new BusinessLogicException(
          'Deposit must be paid before submitting work for client approval',
          PAYMENT_GATE_ERROR.DELIVERY_BLOCKED_DEPOSIT,
        );
      }
    }
  }

  async getPayability(
    milestoneId: string,
    projectId: string,
    clientId: string,
  ): Promise<PaymentGateContext> {
    try {
      await this.assertCanCreateIntent(clientId, projectId, milestoneId);
      const isDeposit = await this.isDepositMilestone(milestoneId, projectId);
      return { canPay: true, isDeposit };
    } catch (e) {
      if (e instanceof BusinessLogicException) {
        return {
          canPay: false,
          reason: e.message,
          code: e.code,
          isDeposit: false,
        };
      }
      throw e;
    }
  }
}
