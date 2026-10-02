import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import {
  BusinessLogicException,
  assertProjectWorkAllowed,
  assertValidTransition,
  isPayOnlyMilestone as milestoneIsPayOnly,
  pickDepositMilestoneId,
  pickDepositIdFromContext,
  resolveMilestoneClientAccess,
  type PaymentSnapshot,
  PAYMENT_GATE_ERROR,
} from '@nestlancer/common';
import { CreateMilestoneDto } from '../dto/create-milestone.dto';
import { UpdateMilestoneDto } from '../dto/update-milestone.dto';
import { OutboxService } from '@nestlancer/outbox';

@Injectable()
export class MilestonesService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly outbox: OutboxService,
    private readonly configService: ConfigService,
  ) {}

  async create(projectId: string, dto: CreateMilestoneDto) {
    // dueDate takes priority; fall back to endDate so either field works
    const resolvedDueDate = dto.dueDate
      ? new Date(dto.dueDate)
      : dto.endDate
        ? new Date(dto.endDate)
        : null;

    const siblings = await this.prismaRead.milestone.findMany({
      where: { projectId },
      select: { id: true, name: true, amount: true, percentage: true, order: true, status: true },
    });

    // NL-DATA-002: skip create when a same-named milestone already exists on the project.
    const existing = siblings.find(
      (m) => (m.name ?? '').trim().toLowerCase() === dto.name.trim().toLowerCase(),
    );
    if (existing) {
      return existing;
    }

    const scheduleName =
      /^(deposit|full payment|mid[- ]?project payment|final payment|milestone \d+|payment \d+)\b/i;
    const hasBillableSchedule = siblings.some(
      (m) =>
        (m.amount ?? 0) > 0 &&
        ((m.percentage ?? 0) > 0 || scheduleName.test(String(m.name ?? '').trim())),
    );

    // Clean up empty placeholder "Project delivery" milestone if adding custom work milestones
    const placeholders = siblings.filter(
      (m) =>
        String(m.name ?? '').trim().toLowerCase() === 'project delivery' &&
        Number(m.amount ?? 0) === 0 &&
        m.status === 'PENDING',
    );
    for (const ph of placeholders) {
      const deliverableCount = await this.prismaWrite.deliverable.count({
        where: { milestoneId: ph.id },
      });
      if (deliverableCount === 0) {
        await this.prismaWrite.milestone.delete({ where: { id: ph.id } }).catch(() => {});
      }
    }

    // NL-BUG-MS-001: never reuse an order already taken on this project.
    const remainingSiblings = siblings.filter((m) => !placeholders.some((ph) => ph.id === m.id));
    const taken = new Set(remainingSiblings.map((m) => m.order));
    let order = dto.order ?? (await this.getNextOrder(projectId));
    if (taken.has(order) || hasBillableSchedule) {
      order = remainingSiblings.reduce((max, m) => Math.max(max, m.order ?? 0), 0) + 1;
      while (taken.has(order)) order += 1;
    }

    const milestone = await this.prismaWrite.milestone.create({
      data: {
        projectId,
        name: dto.name,
        description: dto.description,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        dueDate: resolvedDueDate,
        // NL-BUG-PAY-002: delivery rows must not copy the contract value.
        amount: hasBillableSchedule ? 0 : (dto.amount ?? null),
        percentage: hasBillableSchedule ? 0 : undefined,
        order,
        status: 'PENDING',
      },
    });

    return milestone;
  }

  async update(id: string, dto: UpdateMilestoneDto) {
    try {
      const resolvedDueDate = dto.dueDate
        ? new Date(dto.dueDate)
        : dto.endDate
          ? new Date(dto.endDate)
          : undefined;

      const milestone = await this.prismaWrite.milestone.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          dueDate: resolvedDueDate,
          amount: dto.amount ?? undefined,
          order: dto.order,
        },
      });
      return milestone;
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundException('Milestone not found');
      }
      throw error;
    }
  }

  async complete(id: string) {
    const milestone = await this.prismaRead.milestone.findUnique({ where: { id } });
    if (!milestone) throw new NotFoundException('Milestone not found');

    if (await this.isPayOnlyMilestone(id, milestone.projectId)) {
      throw new BusinessLogicException(
        'Payment-schedule milestones are pay-only. Submit work milestones for client approval after the deposit is paid.',
        PAYMENT_GATE_ERROR.DEPOSIT_DELIVERY_NOT_ALLOWED,
      );
    }

    // NL-BUG-DEL-001: a work milestone with nothing delivered must not flip to COMPLETED
    // (that unlocks project completion and the final payment gate).
    const submittedWork = await this.prismaRead.deliverable.count({
      where: {
        milestoneId: id,
        status: { in: ['READY_FOR_REVIEW', 'IN_PROGRESS', 'REVISION_REQUESTED', 'APPROVED'] },
      },
    });
    if (submittedWork < 1) {
      throw new BusinessLogicException(
        'Upload at least one deliverable before submitting this milestone for client approval',
        'MILESTONE_DELIVERABLE_REQUIRED',
      );
    }

    const allowedFrom = new Set(['PENDING', 'IN_PROGRESS', 'REVISION_REQUESTED']);
    if (!allowedFrom.has(milestone.status as string)) {
      throw new BusinessLogicException(
        `Cannot submit milestone for client approval while status is ${milestone.status}`,
        PAYMENT_GATE_ERROR.DELIVERY_BLOCKED_DEPOSIT,
      );
    }

    await this.assertDepositPaidForDelivery(milestone.projectId);
    await this.assertProjectAllowsWork(milestone.projectId);
    await this.assertMilestoneNotPhaseLocked(id, milestone.projectId);

    // PENDING → IN_PROGRESS → COMPLETED (state machine does not allow PENDING → COMPLETED)
    if (milestone.status === 'PENDING') {
      assertValidTransition('MILESTONE', 'PENDING', 'IN_PROGRESS');
      assertValidTransition('MILESTONE', 'IN_PROGRESS', 'COMPLETED');
    } else {
      assertValidTransition('MILESTONE', milestone.status as string, 'COMPLETED');
    }

    const reviewDays =
      this.configService.get<number>('progress.approvalWindowDays') ??
      parseInt(process.env.APPROVAL_WINDOW_DAYS || '7', 10);
    const reviewStartedAt = new Date();
    const reviewDeadlineAt = new Date(reviewStartedAt.getTime() + reviewDays * 24 * 60 * 60 * 1000);

    const wasRevision = milestone.status === 'REVISION_REQUESTED';

    const updated = await this.prismaWrite.$transaction(async (tx: any) => {
      const ms = await tx.milestone.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: reviewStartedAt,
          reviewStartedAt,
          reviewDeadlineAt,
        },
      });

      await tx.outbox.create({
        data: {
          type: 'MILESTONE_COMPLETED',
          payload: {
            milestoneId: id,
            projectId: ms.projectId,
            name: ms.name,
            wasRevision,
          },
        },
      });

      return ms;
    });

    return updated;
  }

  private async assertProjectAllowsWork(projectId: string): Promise<void> {
    const project = await this.prismaRead.project.findUnique({
      where: { id: projectId },
      select: { status: true },
    });
    if (project) assertProjectWorkAllowed(project.status);
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

  private async assertDepositPaidForDelivery(projectId: string): Promise<void> {
    const project = await this.prismaRead.project.findUnique({
      where: { id: projectId },
      select: { status: true },
    });
    if (project?.status !== 'PENDING_PAYMENT') return;

    const milestones = await this.prismaRead.milestone.findMany({
      where: { projectId },
      select: { id: true, order: true, createdAt: true },
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
    if (!depositId) return;

    const depositPaid = await this.prismaRead.payment.count({
      where: {
        projectId,
        milestoneId: depositId,
        status: 'COMPLETED',
      },
    });
    if (depositPaid < 1) {
      throw new BusinessLogicException(
        'Deposit must be paid before submitting work for client approval',
        PAYMENT_GATE_ERROR.DELIVERY_BLOCKED_DEPOSIT,
      );
    }
  }

  private async assertMilestoneNotPhaseLocked(
    milestoneId: string,
    projectId: string,
  ): Promise<void> {
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
    const access = resolveMilestoneClientAccess(
      milestoneId,
      milestones,
      paymentSnapshots,
      depositId,
    );
    if (access.isLocked) {
      throw new BusinessLogicException(
        access.lockReason ??
          'Complete earlier milestones before submitting this one for client approval',
        PAYMENT_GATE_ERROR.MILESTONE_PHASE_LOCKED,
      );
    }
  }

  private async getNextOrder(projectId: string): Promise<number> {
    const last = await this.prismaRead.milestone.findFirst({
      where: { projectId },
      orderBy: { order: 'desc' },
    });
    return last ? last.order + 1 : 1;
  }
}
