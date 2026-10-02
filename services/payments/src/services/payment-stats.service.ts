import { Injectable } from '@nestjs/common';
import { PrismaReadService } from '@nestlancer/database';
import { PaymentStatus } from '@nestlancer/common';

@Injectable()
export class PaymentStatsService {
  constructor(private readonly prismaRead: PrismaReadService) {}

  async getStats() {
    const [
      totalPayments,
      collectedPayments,
      pendingPayments,
      disputedPayments,
      refundedPayments,
      recentPayments,
    ] = await Promise.all([
      this.prismaRead.payment.aggregate({
        _sum: { amount: true },
        _count: { id: true },
      }),
      // Captured money stays in "collected" until refunded — open disputes must not
      // yank revenue from the KPI (NL-BUG-DISP-001 residual).
      this.prismaRead.payment.aggregate({
        _sum: { amount: true },
        _count: { id: true },
        where: {
          status: { in: [PaymentStatus.COMPLETED, PaymentStatus.DISPUTED] },
        },
      }),
      this.prismaRead.payment.aggregate({
        _sum: { amount: true },
        _count: { id: true },
        where: {
          status: {
            in: [
              PaymentStatus.CREATED,
              PaymentStatus.PENDING,
              PaymentStatus.PROCESSING,
              PaymentStatus.PENDING_VERIFICATION,
            ],
          },
        },
      }),
      this.prismaRead.payment.aggregate({
        _sum: { amount: true },
        _count: { id: true },
        where: { status: PaymentStatus.DISPUTED },
      }),
      this.prismaRead.payment.aggregate({
        _sum: { amountRefunded: true },
        _count: { id: true },
        where: { status: PaymentStatus.REFUNDED },
      }),
      this.prismaRead.payment.findMany({
        where: { status: { in: [PaymentStatus.COMPLETED, PaymentStatus.DISPUTED] } },
        orderBy: { paidAt: 'desc' },
        take: 10,
        select: {
          id: true,
          amount: true,
          currency: true,
          paidAt: true,
          client: { select: { firstName: true, lastName: true } },
          project: { select: { title: true } },
        },
      }),
    ]);

    return {
      totalRevenue: collectedPayments._sum.amount || 0,
      totalTransactions: totalPayments._count.id || 0,
      completedTransactions: collectedPayments._count.id || 0,
      pendingAmount: pendingPayments._sum.amount || 0,
      pendingTransactions: pendingPayments._count.id || 0,
      disputedAmount: disputedPayments._sum.amount || 0,
      disputedTransactions: disputedPayments._count.id || 0,
      totalRefunded: refundedPayments._sum.amountRefunded || 0,
      refundedTransactions: refundedPayments._count.id || 0,
      recentTransactions: recentPayments.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        paidAt: p.paidAt,
        clientName: `${(p as any).client.firstName} ${(p as any).client.lastName}`,
        projectTitle: (p as any).project.title,
      })),
    };
  }
}
