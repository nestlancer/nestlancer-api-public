import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { ApproveMilestoneDto } from '../dto/approve-milestone.dto';
import { RequestMilestoneRevisionDto } from '../dto/request-milestone-revision.dto';
import { OutboxService } from '@nestlancer/outbox';
import {
  pickDepositMilestoneId,
  isPayOnlyMilestone as milestoneIsPayOnly,
  resolveInstallmentMilestoneForWorkApproval,
  resolvePaymentTerms,
  pickDepositIdFromContext,
  resolveMilestoneClientAccess,
  clientAccessibleProjectWhere,
  type PaymentSnapshot,
  PAYMENT_GATE_ERROR,
  BusinessLogicException,
} from '@nestlancer/common';

const REVISION_OVERFLOW_PREFIX = 'REVISION_OVERFLOW:';

function isUserId(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

@Injectable()
export class MilestoneApprovalService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly outbox: OutboxService,
  ) {}

  async approve(milestoneId: string, userId: string, dto: ApproveMilestoneDto) {
    const milestone = await this.prismaRead.milestone.findUnique({ where: { id: milestoneId } });
    if (!milestone) throw new NotFoundException('Milestone not found');
    await this.assertProjectOwner(milestone.projectId, userId);
    if (milestone.status !== 'COMPLETED') {
      throw new BadRequestException('Only COMPLETED milestones can be approved');
    }

    if (await this.isPayOnlyMilestone(milestoneId, milestone.projectId)) {
      throw new BadRequestException(
        'Payment-schedule milestones do not require client delivery approval — pay the installment after work is approved',
      );
    }

    await this.assertClientDeliveryAction(milestoneId, milestone.projectId, 'approve');

    const updated = await this.prismaWrite.$transaction(async (tx: any) => {
      const ms = await tx.milestone.update({
        where: { id: milestoneId },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
        },
      });

      // NL-DEL-003/004: closing the milestone must also close open deliverable reviews.
      await tx.deliverable.updateMany({
        where: {
          milestoneId,
          status: {
            in: ['READY_FOR_REVIEW', 'PENDING', 'IN_PROGRESS', 'REVISION_REQUESTED'],
          },
        },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
        },
      });

      if (dto.feedback) {
        await tx.progressEntry.create({
          data: {
            projectId: ms.projectId,
            milestoneId: ms.id,
            type: 'UPDATE',
            title: 'Milestone Approved',
            description: dto.feedback,
            actorId: userId,
            visibility: 'CLIENT_VISIBLE',
          },
        });
      }

      await tx.outbox.create({
        data: {
          type: 'MILESTONE_APPROVED',
          payload: {
            milestoneId: ms.id,
            projectId: ms.projectId,
            approvedBy: userId,
          },
        },
      });

      await this.scheduleMilestonePayment(tx, ms.id, ms.projectId);

      return ms;
    });

    return updated;
  }

  /**
   * After the last open deliverable is approved, advance the parent milestone to APPROVED.
   * Accepts PENDING / IN_PROGRESS / REVIEW / COMPLETED so admin-created deliverables
   * (which skip an explicit "mark complete") still cascade (NL-BUG-DEL-001).
   */
  async advanceIfDeliverablesClosed(
    milestoneId: string,
    actorId: string | null,
    feedback?: string,
  ): Promise<boolean> {
    const milestone = await this.prismaWrite.milestone.findUnique({
      where: { id: milestoneId },
      select: { id: true, projectId: true, status: true },
    });
    if (!milestone) return false;

    const status = String(milestone.status).toUpperCase();
    const cascadeEligible = new Set(['PENDING', 'IN_PROGRESS', 'REVIEW', 'COMPLETED']);
    if (!cascadeEligible.has(status)) {
      return false;
    }

    const remaining = await this.prismaWrite.deliverable.count({
      where: {
        milestoneId,
        status: {
          in: [
            'READY_FOR_REVIEW',
            'PENDING',
            'IN_PROGRESS',
            'REVISION_REQUESTED',
          ],
        },
      },
    });

    // NL-DEL-003: always recompute milestone.progress from deliverable outcomes,
    // even when open items remain or the row is a pay-only installment.
    await this.syncMilestoneDeliverableProgress(milestoneId);

    if (remaining > 0) return false;

    const deliverableCount = await this.prismaWrite.deliverable.count({
      where: { milestoneId },
    });
    // Pay-only installments skip delivery cascade — unless deliverables were
    // actually attached (admin attached work to a schedule row).
    if (deliverableCount === 0 && (await this.isPayOnlyMilestone(milestoneId, milestone.projectId))) {
      return false;
    }

    const progressActorId = isUserId(actorId) ? actorId : null;

    await this.prismaWrite.$transaction(async (tx: any) => {
      const now = new Date();
      await tx.milestone.update({
        where: { id: milestoneId },
        data: {
          status: 'APPROVED',
          approvedAt: now,
          // Mirror payment-completion path (NL-BUG-DEL-001 / DEL-003): cascade
          // previously left completedAt null even after all deliverables closed.
          completedAt: now,
        },
      });

      await tx.progressEntry.create({
        data: {
          projectId: milestone.projectId,
          milestoneId,
          type: 'UPDATE',
          title: 'Milestone Approved',
          description: feedback || 'Approved via deliverable acceptance',
          actorId: progressActorId,
          visibility: 'CLIENT_VISIBLE',
        },
      });

      await tx.outbox.create({
        data: {
          type: 'MILESTONE_APPROVED',
          payload: {
            milestoneId,
            projectId: milestone.projectId,
            approvedBy: actorId,
            via: 'deliverable_acceptance',
          },
        },
      });

      await this.scheduleMilestonePayment(tx, milestoneId, milestone.projectId);
      await this.syncProjectOverallProgress(tx, milestone.projectId);
    });

    return true;
  }

  /** Recompute project.overallProgress from milestone statuses (NL-BUG-DEL-001). */
  private async syncProjectOverallProgress(tx: any, projectId: string): Promise<void> {
    const milestones = await tx.milestone.findMany({
      where: { projectId },
      select: { status: true },
    });
    if (milestones.length === 0) return;
    const completedStatuses = new Set(['COMPLETED', 'REVIEW', 'APPROVED']);
    const completed = milestones.filter((m: { status: string }) =>
      completedStatuses.has(String(m.status).toUpperCase()),
    ).length;
    const overallProgress = Math.round((completed / milestones.length) * 100);
    await tx.project.update({
      where: { id: projectId },
      data: { overallProgress },
    });
  }

  /** NL-DEL-003: milestone.progress = % of deliverables approved (0 when none). */
  private async syncMilestoneDeliverableProgress(milestoneId: string): Promise<void> {
    const [total, approved] = await Promise.all([
      this.prismaWrite.deliverable.count({ where: { milestoneId } }),
      this.prismaWrite.deliverable.count({
        where: { milestoneId, status: 'APPROVED' },
      }),
    ]);
    if (total === 0) return;
    const progress = Math.round((approved / total) * 100);
    await this.prismaWrite.milestone.update({
      where: { id: milestoneId },
      data: { progress },
    });
  }

  /**
   * NL-DEL-003/004 self-heal: close open deliverables when the milestone is already APPROVED.
   */
  async healOpenDeliverablesForApprovedMilestones(milestoneIds: string[]): Promise<number> {
    if (milestoneIds.length === 0) return 0;
    const result = await this.prismaWrite.deliverable.updateMany({
      where: {
        milestoneId: { in: milestoneIds },
        status: {
          in: [
            'READY_FOR_REVIEW',
            'PENDING',
            'IN_PROGRESS',
            'REVISION_REQUESTED',
          ],
        },
      },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
      },
    });
    return result.count;
  }

  async processDeemedAcceptance(): Promise<number> {
    const now = new Date();
    const due = await this.prismaRead.milestone.findMany({
      where: {
        status: 'COMPLETED',
        reviewDeadlineAt: { lt: now },
        deemedAcceptedAt: null,
      },
      select: { id: true, projectId: true },
      take: 50,
    });

    let processed = 0;
    for (const row of due) {
      try {
        await this.deemApprove(row.id, row.projectId);
        processed += 1;
      } catch {
        // skip row on conflict
      }
    }
    return processed;
  }

  private async deemApprove(milestoneId: string, projectId: string) {
    const milestone = await this.prismaRead.milestone.findUnique({ where: { id: milestoneId } });
    if (!milestone || milestone.status !== 'COMPLETED') return;

    await this.prismaWrite.$transaction(async (tx: any) => {
      await tx.milestone.update({
        where: { id: milestoneId },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          deemedAcceptedAt: new Date(),
        },
      });

      await tx.deliverable.updateMany({
        where: {
          milestoneId,
          status: {
            in: ['READY_FOR_REVIEW', 'PENDING', 'IN_PROGRESS', 'REVISION_REQUESTED'],
          },
        },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
        },
      });

      await tx.progressEntry.create({
        data: {
          projectId,
          milestoneId,
          type: 'UPDATE',
          title: 'Milestone deemed approved',
          description:
            'Automatically approved after the review period ended with no client response.',
          visibility: 'CLIENT_VISIBLE',
        },
      });

      await tx.outbox.create({
        data: {
          type: 'MILESTONE_APPROVED',
          payload: {
            milestoneId,
            projectId,
            approvedBy: 'system',
            deemedAccept: true,
          },
        },
      });

      await this.scheduleMilestonePayment(tx, milestoneId, projectId);
    });
  }

  async requestRevision(milestoneId: string, userId: string, dto: RequestMilestoneRevisionDto) {
    const milestone = await this.prismaRead.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        project: {
          select: {
            clientId: true,
            quote: {
              select: { revisionsIncluded: true, additionalRevisionCost: true },
            },
          },
        },
      },
    } as any);
    if (!milestone) throw new NotFoundException('Milestone not found');
    await this.assertProjectOwner(milestone.projectId, userId);

    const isPrePaymentRevision = milestone.status === 'APPROVED';
    if (!isPrePaymentRevision && milestone.status !== 'COMPLETED') {
      throw new BadRequestException(
        'Can only request revision on milestones ready for review or awaiting payment',
      );
    }

    if (isPrePaymentRevision) {
      const access = await this.getClientAccess(milestoneId, milestone.projectId);
      if (!access.canRequestPrePaymentRevision) {
        throw new BadRequestException(
          'Changes can only be requested before the installment is paid',
        );
      }
      return this.requestPrePaymentRevision(milestoneId, userId, dto);
    }

    const included = (milestone as any).project?.quote?.revisionsIncluded ?? 2;
    const nextCount = ((milestone as any).revisionCount ?? 0) + 1;

    if (nextCount > included) {
      const extraCost = (milestone as any).project?.quote?.additionalRevisionCost;
      if (extraCost && extraCost > 0) {
        const clientId = (milestone as any).project?.clientId;
        const payment = await this.prismaWrite.payment.create({
          data: {
            projectId: milestone.projectId,
            milestoneId,
            clientId,
            amount: extraCost,
            currency: 'INR',
            status: 'PENDING',
            customNotes: `${REVISION_OVERFLOW_PREFIX}${JSON.stringify({
              reason: dto.reason,
              userId,
            })}`,
          } as any,
        });
        return {
          requiresAdditionalPayment: true,
          paymentId: payment.id,
          amount: extraCost,
          revisionCount: nextCount,
          revisionsIncluded: included,
          message:
            'This revision exceeds included revisions. Pay the additional charge to request revision.',
        };
      }
    }

    const updated = await this.prismaWrite.$transaction(async (tx: any) => {
      const ms = await tx.milestone.update({
        where: { id: milestoneId },
        data: {
          status: 'REVISION_REQUESTED',
          revisionCount: nextCount,
        } as any,
      });

      await tx.progressEntry.create({
        data: {
          projectId: ms.projectId,
          milestoneId: ms.id,
          type: 'UPDATE',
          title: 'Revision Requested on Milestone',
          description: dto.reason,
          actorId: userId,
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
            requestedBy: userId,
            reason: dto.reason,
            revisionCount: nextCount,
          },
        },
      });

      return ms;
    });

    return updated;
  }

  /** Client requests changes after approving delivery but before paying the installment. */
  private async requestPrePaymentRevision(
    milestoneId: string,
    userId: string,
    dto: RequestMilestoneRevisionDto,
  ) {
    const milestone = await this.prismaRead.milestone.findUnique({ where: { id: milestoneId } });
    if (!milestone) throw new NotFoundException('Milestone not found');

    const updated = await this.prismaWrite.$transaction(async (tx: any) => {
      const milestones = await tx.milestone.findMany({
        where: { projectId: milestone.projectId },
        select: { id: true, name: true, order: true, createdAt: true },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      });
      const payments = await tx.payment.findMany({
        where: { projectId: milestone.projectId, milestoneId: { not: null } },
        select: { id: true, milestoneId: true, status: true, paymentRequestedAt: true },
      });
      const withPay = payments
        .map((p: { milestoneId: string | null }) => p.milestoneId)
        .filter((id: string | null): id is string => typeof id === 'string');
      const depositId = pickDepositMilestoneId(milestones, withPay);
      const installment = resolveInstallmentMilestoneForWorkApproval(
        milestones.find((m: { id: string }) => m.id === milestoneId) ?? milestone,
        milestones,
        depositId,
      );

      const openPayment = payments.find(
        (p: { milestoneId: string | null }) => p.milestoneId === installment.id,
      );
      if (openPayment) {
        await tx.payment.update({
          where: { id: openPayment.id },
          data: {
            paymentRequestedAt: null,
            status: openPayment.status === 'COMPLETED' ? openPayment.status : 'CREATED',
          },
        });
      }

      const ms = await tx.milestone.update({
        where: { id: milestoneId },
        data: {
          status: 'REVISION_REQUESTED',
          approvedAt: null,
        },
      });

      await tx.progressEntry.create({
        data: {
          projectId: ms.projectId,
          milestoneId: ms.id,
          type: 'UPDATE',
          title: 'Changes requested before payment',
          description: dto.reason,
          actorId: userId,
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
            requestedBy: userId,
            reason: dto.reason,
            prePaymentRevision: true,
          },
        },
      });

      return ms;
    });

    return updated;
  }

  private async getClientAccess(milestoneId: string, projectId: string) {
    const milestones = await this.prismaRead.milestone.findMany({
      where: { projectId },
      select: { id: true, name: true, order: true, createdAt: true, status: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    const payments = await this.prismaRead.payment.findMany({
      where: { projectId, milestoneId: { not: null } },
      select: { milestoneId: true, status: true, paymentRequestedAt: true },
    });
    const paymentSnapshots: PaymentSnapshot[] = payments
      .filter((p) => p.milestoneId)
      .map((p) => ({
        milestoneId: p.milestoneId as string,
        status: p.status,
        paymentRequestedAt: p.paymentRequestedAt,
      }));
    const depositId = pickDepositIdFromContext(milestones, paymentSnapshots);
    return resolveMilestoneClientAccess(milestoneId, milestones, paymentSnapshots, depositId);
  }

  private async assertProjectOwner(projectId: string, userId: string): Promise<void> {
    const project = await this.prismaRead.project.findFirst({
      where: clientAccessibleProjectWhere(userId, projectId),
      select: { id: true },
    });
    if (!project) {
      throw new BusinessLogicException('Project not found', 'PROJECT_001');
    }
  }

  private async assertClientDeliveryAction(
    milestoneId: string,
    projectId: string,
    action: 'approve' | 'review',
  ): Promise<void> {
    const access = await this.getClientAccess(milestoneId, projectId);
    if (access.isLocked) {
      throw new BusinessLogicException(
        access.lockReason ?? 'This milestone is locked until earlier milestones are complete',
        PAYMENT_GATE_ERROR.MILESTONE_PHASE_LOCKED,
      );
    }
    if (action === 'approve' && !access.canReviewDelivery) {
      throw new BadRequestException('This milestone is not ready for approval');
    }
  }

  /** Set payment due date and emit PAYMENT_REQUESTED for non-deposit milestones. */
  private async scheduleMilestonePayment(
    tx: any,
    milestoneId: string,
    projectId: string,
  ): Promise<void> {
    // Deposit never gets a post-approval payment request.
    const milestones = await tx.milestone.findMany({
      where: { projectId },
      select: { id: true, name: true, order: true, createdAt: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    const payments = await tx.payment.findMany({
      where: { projectId, milestoneId: { not: null } },
      select: { milestoneId: true },
      distinct: ['milestoneId'],
    });
    const withPay = payments
      .map((p: { milestoneId: string | null }) => p.milestoneId)
      .filter((id: string | null): id is string => typeof id === 'string');
    const depositId = pickDepositMilestoneId(milestones, withPay);
    const approvedMilestone = milestones.find((m: { id: string }) => m.id === milestoneId);
    if (!approvedMilestone) return;
    if (depositId === milestoneId) return;

    const paymentTarget = resolveInstallmentMilestoneForWorkApproval(
      approvedMilestone,
      milestones,
      depositId,
    );

    const project = await tx.project.findUnique({
      where: { id: projectId },
      select: { quote: { select: { paymentTerms: true } } },
    });
    const terms = resolvePaymentTerms(project?.quote?.paymentTerms);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + terms.milestonePaymentDueDays);
    const now = new Date();

    const payment = await tx.payment.findFirst({
      where: { milestoneId: paymentTarget.id, projectId },
      orderBy: { createdAt: 'desc' },
    });

    if (payment) {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          paymentRequestedAt: now,
          dueDate,
          status: payment.status === 'COMPLETED' ? payment.status : 'PENDING',
        },
      });

      await tx.outbox.create({
        data: {
          type: 'PAYMENT_REQUESTED',
          payload: {
            paymentId: payment.id,
            projectId,
            milestoneId: paymentTarget.id,
            dueDate: dueDate.toISOString(),
          },
        },
      });
    }
  }

  private async isPayOnlyMilestone(milestoneId: string, projectId: string): Promise<boolean> {
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
    const depositId = pickDepositMilestoneId(milestones, withPay);
    const milestone = milestones.find((m) => m.id === milestoneId);
    if (!milestone) return false;
    return milestoneIsPayOnly(milestone, milestones, depositId);
  }
}
