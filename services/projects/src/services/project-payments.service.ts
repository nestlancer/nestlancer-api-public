import { Injectable } from '@nestjs/common';
import { PrismaReadService } from '@nestlancer/database';
import { BusinessLogicException, clientAccessibleProjectWhere } from '@nestlancer/common';

import { ProjectPaymentScheduleService } from './project-payment-schedule.service';

@Injectable()
export class ProjectPaymentsService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly paymentSchedule: ProjectPaymentScheduleService,
  ) {}

  async getPayments(userId: string, projectId: string) {
    const project = await this.prismaRead.project.findFirst({
      where: clientAccessibleProjectWhere(userId, projectId),
      include: {
        quote: { select: { totalAmount: true, currency: true } },
      },
    });

    if (!project) throw new BusinessLogicException('Project not found', 'PROJECT_001');

    let payments = await this.prismaRead.payment.findMany({
      where: { projectId, clientId: userId },
      orderBy: { createdAt: 'asc' },
      include: {
        milestone: { select: { id: true, name: true } },
      },
    });

    if (payments.length === 0) {
      await this.paymentSchedule.backfillIfMissing(projectId, userId);
      payments = await this.prismaRead.payment.findMany({
        where: { projectId, clientId: userId },
        orderBy: { createdAt: 'asc' },
        include: {
          milestone: { select: { id: true, name: true } },
        },
      });
    }

    const paid = payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0);

    const pending = payments
      .filter((p) => !['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(p.status))
      .reduce((sum, p) => sum + p.amount, 0);

    const total =
      (project as { quote?: { totalAmount: number } }).quote?.totalAmount ?? paid + pending;

    const nextPending = payments.find((p) => p.status === 'CREATED' || p.status === 'PENDING');

    return {
      total,
      paid,
      pending,
      currency: (project as { quote?: { currency: string } }).quote?.currency ?? 'INR',
      nextPayment: nextPending
        ? {
            id: nextPending.id,
            amount: nextPending.amount,
            status: nextPending.status,
            milestoneId: nextPending.milestoneId,
            milestoneName: (nextPending as { milestone?: { name: string } }).milestone?.name,
          }
        : null,
      history: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        milestoneId: p.milestoneId,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
      })),
    };
  }
}
