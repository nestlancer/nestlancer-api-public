import { Injectable, Logger } from '@nestjs/common';
import { PrismaWriteService } from '@nestlancer/database';
import {
  paymentScheduleToMilestoneRows,
  resolveQuotePaymentSchedule,
  isPaymentScheduleMilestone,
} from '@nestlancer/common';

@Injectable()
export class ProjectPaymentScheduleService {
  private readonly logger = new Logger(ProjectPaymentScheduleService.name);

  constructor(private readonly prismaWrite: PrismaWriteService) {}

  /**
   * Creates progress milestones and CREATED payment rows from the quote payment schedule.
   * Idempotent: skips when milestones already exist for the project.
   */
  async ensureSchedule(
    tx: {
      milestone: {
        count: (args: unknown) => Promise<number>;
        findMany: (args: unknown) => Promise<
          Array<{ name: string; order: number | null; percentage?: number | null }>
        >;
        create: (args: unknown) => Promise<{ id: string }>;
        createManyAndReturn: (args: unknown) => Promise<Array<{ id: string }>>;
      };
      payment: {
        findFirst: (args: unknown) => Promise<{ id: string } | null>;
        create: (args: unknown) => Promise<unknown>;
        createMany: (args: unknown) => Promise<unknown>;
      };
    },
    params: {
      projectId: string;
      clientId: string;
      quote: {
        paymentSchedule?: unknown;
        paymentBreakdown?: unknown;
        timeline?: unknown;
        totalAmount: number;
        currency: string;
      };
      targetEndDate: Date;
    },
  ): Promise<{ milestonesCreated: number; paymentsCreated: number }> {
    const existingCount = await tx.milestone.count({
      where: { projectId: params.projectId },
    });
    if (existingCount > 0) {
      // Repair projects created before delivery milestones were auto-provisioned.
      await this.ensureDeliveryMilestone(tx, params.projectId, params.targetEndDate);
      return { milestonesCreated: 0, paymentsCreated: 0 };
    }

    const schedule = resolveQuotePaymentSchedule({
      totalAmountPaise: params.quote.totalAmount,
      paymentSchedule: params.quote.paymentSchedule,
      paymentBreakdown: params.quote.paymentBreakdown,
      timeline: params.quote.timeline,
    });

    if (schedule.length === 0) {
      return { milestonesCreated: 0, paymentsCreated: 0 };
    }

    const rows = paymentScheduleToMilestoneRows(schedule, params.targetEndDate);
    const eligibleRows = rows.filter((row) => row.amount > 0);
    if (eligibleRows.length === 0) {
      return { milestonesCreated: 0, paymentsCreated: 0 };
    }

    const now = new Date();
    const milestones = await tx.milestone.createManyAndReturn({
      data: eligibleRows.map((row) => {
        const dueDate = row.dueDate < now ? now : row.dueDate;
        return {
          projectId: params.projectId,
          name: row.name,
          description: row.description,
          amount: row.amount,
          percentage: row.percentage,
          dueDate,
          order: row.order,
          status: 'PENDING',
          startDate: now,
          endDate: dueDate,
        };
      }),
    });

    await tx.payment.createMany({
      data: milestones.map((milestone, index) => ({
        projectId: params.projectId,
        milestoneId: milestone.id,
        clientId: params.clientId,
        amount: eligibleRows[index]!.amount,
        currency: params.quote.currency || 'INR',
        status: 'CREATED',
      })),
      skipDuplicates: true,
    });

    const milestonesCreated = milestones.length;
    const paymentsCreated = milestonesCreated;

    await this.ensureDeliveryMilestone(tx, params.projectId, params.targetEndDate);

    this.logger.log(
      `Payment schedule for project ${params.projectId}: ${milestonesCreated} milestones, ${paymentsCreated} payments`,
    );

    return { milestonesCreated, paymentsCreated };
  }

  /** Schedule/installment rows cannot host deliverables — need a delivery phase (NL-MS-002). */
  private isScheduleInstallment(row: {
    name?: string | null;
    percentage?: number | null;
  }): boolean {
    return isPaymentScheduleMilestone({
      id: 'probe',
      name: row.name,
      percentage: row.percentage,
    });
  }

  private async ensureDeliveryMilestone(
    tx: {
      milestone: {
        findMany: (args: unknown) => Promise<
          Array<{ name: string; order: number | null; percentage?: number | null }>
        >;
        create: (args: unknown) => Promise<{ id: string }>;
      };
    },
    projectId: string,
    targetEndDate: Date,
  ): Promise<void> {
    const existing = await tx.milestone.findMany({
      where: { projectId },
      select: { name: true, order: true, percentage: true },
    });
    if (existing.length === 0) return;
    const hasDeliveryPhase = existing.some((row) => !this.isScheduleInstallment(row));
    if (hasDeliveryPhase) return;

    const now = new Date();
    const endDate = targetEndDate > now ? targetEndDate : now;
    const maxOrder = existing.reduce((max, row) => Math.max(max, row.order ?? 0), 0);
    await tx.milestone.create({
      data: {
        projectId,
        name: 'Project delivery',
        description: 'Work and deliverables for this engagement',
        amount: 0,
        percentage: 0,
        dueDate: endDate,
        order: maxOrder + 1,
        status: 'PENDING',
        startDate: now,
        endDate,
      },
    });
    this.logger.log(`Added default delivery milestone for project ${projectId} (schedule was pay-only)`);
  }

  /**
   * Repair engagements created before delivery milestones were auto-provisioned.
   * Returns true when a delivery row was inserted.
   */
  async ensureDeliveryIfPayOnly(projectId: string): Promise<boolean> {
    const existing = await this.prismaWrite.milestone.findMany({
      where: { projectId },
      select: { name: true, percentage: true },
    });
    if (existing.length === 0) return false;
    if (existing.some((row) => !this.isScheduleInstallment(row))) return false;

    const project = await this.prismaWrite.project.findUnique({
      where: { id: projectId },
      select: { targetEndDate: true },
    });
    await this.prismaWrite.$transaction(async (tx) => {
      await this.ensureDeliveryMilestone(
        tx as Parameters<ProjectPaymentScheduleService['ensureDeliveryMilestone']>[0],
        projectId,
        project?.targetEndDate ?? new Date(),
      );
    });
    return true;
  }

  /** Backfill schedule for projects that were created before auto-setup existed. */
  async backfillIfMissing(projectId: string, clientId: string): Promise<void> {
    const project = await this.prismaWrite.project.findUnique({
      where: { id: projectId },
      include: {
        quote: {
          select: {
            paymentSchedule: true,
            paymentBreakdown: true,
            totalAmount: true,
            currency: true,
            timeline: true,
          },
        },
      },
    });
    if (!project?.quote) return;

    await this.prismaWrite.$transaction(
      async (tx) => {
        await this.ensureSchedule(
          tx as Parameters<ProjectPaymentScheduleService['ensureSchedule']>[0],
          {
            projectId,
            clientId,
            quote: project.quote!,
            targetEndDate: project.targetEndDate ?? new Date(),
          },
        );
      },
      { maxWait: 10_000, timeout: 30_000 },
    );
  }

  /**
   * @deprecated milestoneTemplate path merged into resolveQuotePaymentSchedule.
   */
  async ensureScheduleWithTemplate(
    tx: Parameters<ProjectPaymentScheduleService['ensureSchedule']>[0],
    params: Parameters<ProjectPaymentScheduleService['ensureSchedule']>[1],
  ): Promise<{ milestonesCreated: number; paymentsCreated: number }> {
    return this.ensureSchedule(tx, params);
  }
}
