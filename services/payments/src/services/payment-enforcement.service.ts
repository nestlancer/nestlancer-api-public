import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';
import { resolvePaymentTerms } from '@nestlancer/common';

const ENFORCEMENT_CRON_MS = parseInt(process.env.PAYMENT_ENFORCEMENT_CRON_MS || '86400000', 10);

/**
 * Escalates overdue milestone payments: reminders → PAYMENT_OVERDUE → SUSPENDED + late fees.
 */
@Injectable()
export class PaymentEnforcementService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentEnforcementService.name);
  private intervalRef: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
  ) {}

  onModuleInit(): void {
    if (process.env.PAYMENT_ENFORCEMENT_ENABLED === 'false') return;
    this.intervalRef = setInterval(() => {
      void this.runEnforcement();
    }, ENFORCEMENT_CRON_MS);
  }

  onModuleDestroy(): void {
    if (this.intervalRef) clearInterval(this.intervalRef);
  }

  async runEnforcement(): Promise<number> {
    const now = new Date();
    let payments: Array<{
      id: string;
      projectId: string;
      milestoneId: string | null;
      clientId: string;
      amount: number;
      currency: string;
      reminderCount: number;
      lastReminderAt: Date | null;
      dueDate: Date | null;
      lateFeePaise: number;
      milestone: { name: string } | null;
      client: { email: string };
      project: { id: string; status: string; quote?: { paymentTerms: unknown } } | null;
    }>;

    try {
      payments = (await this.prismaRead.payment.findMany({
        where: {
          status: { in: ['CREATED', 'PENDING'] },
          dueDate: { not: null, lt: now },
          milestone: { status: 'APPROVED' },
        },
        include: {
          project: {
            select: {
              id: true,
              status: true,
              quote: { select: { paymentTerms: true } },
            },
          },
          milestone: { select: { id: true, name: true } },
          client: { select: { id: true, email: true } },
        },
        take: 100,
      } as any)) as unknown as typeof payments;
    } catch (e) {
      this.logger.warn(
        `Payment enforcement query failed: ${e instanceof Error ? e.message : String(e)}`,
      );
      return 0;
    }

    let actions = 0;
    for (const payment of payments) {
      if (!payment.dueDate) continue;

      const daysOverdue = Math.floor(
        (now.getTime() - payment.dueDate.getTime()) / (24 * 60 * 60 * 1000),
      );
      const terms = resolvePaymentTerms(payment.project?.quote?.paymentTerms);

      try {
        if (daysOverdue >= 1 && daysOverdue < 3) {
          await this.sendReminderIfNeeded(payment, 'first');
          actions++;
        } else if (daysOverdue >= 3 && daysOverdue < 7) {
          await this.markPaymentOverdue(payment);
          await this.sendReminderIfNeeded(payment, 'warning');
          actions++;
        } else if (daysOverdue >= 7 && daysOverdue < terms.suspensionAfterDays) {
          await this.applyLateFee(payment, terms.lateFeePercent);
          await this.sendReminderIfNeeded(payment, 'final');
          actions++;
        } else if (daysOverdue >= terms.suspensionAfterDays) {
          await this.suspendProject(payment);
          actions++;
        }
      } catch (e) {
        this.logger.warn(
          `Enforcement skipped for payment ${payment.id}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    if (actions > 0) {
      this.logger.log(`Payment enforcement: ${actions} action(s)`);
    }
    return actions;
  }

  private async sendReminderIfNeeded(
    payment: {
      id: string;
      projectId: string;
      milestoneId: string | null;
      clientId: string;
      amount: number;
      currency: string;
      reminderCount: number;
      lastReminderAt: Date | null;
      milestone: { name: string } | null;
      client: { email: string };
      project: { id: string } | null;
    },
    urgency: string,
  ): Promise<void> {
    if (payment.reminderCount >= 5) return;
    if (payment.lastReminderAt) {
      const hoursSince = (Date.now() - payment.lastReminderAt.getTime()) / (60 * 60 * 1000);
      if (hoursSince < 24) return;
    }

    await this.prismaWrite.$transaction(async (tx: any) => {
      await tx.outbox.create({
        data: {
          type: 'PAYMENT_REMINDER',
          payload: {
            paymentId: payment.id,
            projectId: payment.projectId,
            milestoneId: payment.milestoneId,
            clientId: payment.clientId,
            clientEmail: payment.client.email,
            amount: payment.amount,
            currency: payment.currency,
            milestoneName: payment.milestone?.name,
            urgency,
            remindedAt: new Date().toISOString(),
          },
        },
      });
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          lastReminderAt: new Date(),
          reminderCount: { increment: 1 },
        },
      });
    });
  }

  private async markPaymentOverdue(payment: {
    id: string;
    projectId: string;
    project: { id: string; status: string } | null;
  }): Promise<void> {
    if (payment.project?.status === 'PAYMENT_OVERDUE') return;

    await this.prismaWrite.$transaction(async (tx: any) => {
      await tx.project.update({
        where: { id: payment.projectId },
        data: { status: 'PAYMENT_OVERDUE' },
      });
      await tx.outbox.create({
        data: {
          type: 'PROJECT_STATUS_CHANGED',
          payload: {
            projectId: payment.projectId,
            previousStatus: payment.project?.status,
            status: 'PAYMENT_OVERDUE',
            reason: 'payment_overdue',
            paymentId: payment.id,
          },
        },
      });
    });
  }

  private async applyLateFee(
    payment: { id: string; amount: number; lateFeePaise: number },
    lateFeePercent: number,
  ): Promise<void> {
    if (payment.lateFeePaise > 0) return;
    const fee = Math.round((payment.amount * lateFeePercent) / 100);
    await this.prismaWrite.payment.update({
      where: { id: payment.id },
      data: {
        lateFeePaise: fee,
        amount: payment.amount + fee,
        intentId: null,
        status: 'CREATED',
      } as any,
    });
  }

  private async suspendProject(payment: {
    id: string;
    projectId: string;
    clientId: string;
    project: { id: string; status: string } | null;
  }): Promise<void> {
    if (payment.project?.status === 'SUSPENDED') return;

    await this.prismaWrite.$transaction(async (tx: any) => {
      await tx.project.update({
        where: { id: payment.projectId },
        data: { status: 'SUSPENDED' },
      });
      await tx.outbox.create({
        data: {
          type: 'PROJECT_SUSPENDED',
          payload: {
            projectId: payment.projectId,
            clientId: payment.clientId,
            userId: payment.clientId,
            paymentId: payment.id,
            reason: 'payment_overdue_suspension',
          },
        },
      });
    });
  }
}
