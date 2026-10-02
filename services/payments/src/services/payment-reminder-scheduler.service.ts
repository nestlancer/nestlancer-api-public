import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';
import { PaymentNotificationService } from './payment-notification.service';

const REMINDER_AFTER_DAYS = parseInt(process.env.PAYMENT_REMINDER_AFTER_DAYS || '1', 10);
const MAX_REMINDERS = parseInt(process.env.PAYMENT_REMINDER_MAX_COUNT || '5', 10);

/** @deprecated Use PaymentEnforcementService — kept for explicit legacy opt-in only. */
@Injectable()
export class PaymentReminderSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentReminderSchedulerService.name);
  private intervalRef: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly paymentNotifications: PaymentNotificationService,
  ) {}

  onModuleInit(): void {
    // Consolidated into PaymentEnforcementService (CODE-V3-004). Legacy scheduler is never started
    // unless explicitly re-enabled for a transitional deployment.
    if (process.env.PAYMENT_REMINDER_SCHEDULER_ENABLED !== 'true') {
      this.logger.log(
        'PaymentReminderSchedulerService disabled — PaymentEnforcementService is the sole reminder authority',
      );
      return;
    }
    this.logger.warn(
      'PAYMENT_REMINDER_SCHEDULER_ENABLED=true — duplicate reminders may overlap with PaymentEnforcementService',
    );
    const ms = parseInt(process.env.PAYMENT_REMINDER_CRON_MS || '86400000', 10);
    this.intervalRef = setInterval(() => {
      void this.runReminders();
    }, ms);
  }

  onModuleDestroy(): void {
    if (this.intervalRef) clearInterval(this.intervalRef);
  }

  async runReminders(): Promise<number> {
    const now = new Date();
    const payments = (await this.prismaRead.payment.findMany({
      where: {
        status: { in: ['CREATED', 'PENDING'] },
        OR: [
          { dueDate: { lte: now } },
          {
            dueDate: null,
            paymentRequestedAt: {
              lte: new Date(Date.now() - REMINDER_AFTER_DAYS * 24 * 60 * 60 * 1000),
            },
          },
        ],
      },
      include: {
        milestone: { select: { id: true, name: true, status: true } },
        project: { select: { id: true, title: true } },
        client: { select: { id: true, email: true } },
      },
      take: 100,
    } as any)) as unknown as Array<{
      id: string;
      projectId: string;
      milestoneId: string | null;
      clientId: string;
      amount: number;
      currency: string;
      reminderCount: number;
      lastReminderAt: Date | null;
      dueDate: Date | null;
      milestone: { name: string; status: string } | null;
      client: { email: string };
      project: { title: string };
    }>;

    let sent = 0;
    for (const payment of payments) {
      if (payment.milestone?.status !== 'APPROVED') continue;
      if ((payment.reminderCount ?? 0) >= MAX_REMINDERS) continue;

      const lastReminder = payment.lastReminderAt;
      if (lastReminder) {
        const daysSince = (Date.now() - lastReminder.getTime()) / (24 * 60 * 60 * 1000);
        if (daysSince < REMINDER_AFTER_DAYS) continue;
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
              projectTitle: payment.project?.title,
              dueDate: payment.dueDate?.toISOString(),
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
      await this.paymentNotifications.notifyPaymentReminder({
        clientId: payment.clientId,
        projectId: payment.projectId,
        paymentId: payment.id,
        milestoneName: payment.milestone?.name,
      });
      sent += 1;
    }

    if (sent > 0) {
      this.logger.log(`Queued ${sent} payment reminder(s)`);
    }
    return sent;
  }
}
