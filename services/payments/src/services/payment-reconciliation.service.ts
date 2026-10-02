import { Injectable, Logger } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { PaymentStatus } from '@nestlancer/common';
import { RazorpayService } from './razorpay.service';
import { PaymentConfirmationService } from './payment-confirmation.service';

interface ReconciliationQuery {
  startDate?: Date;
  endDate?: Date;
}

interface PaymentMismatch {
  paymentId: string;
  localStatus: string;
  providerStatus: string;
  localAmount: number;
  providerAmount: number;
  discrepancy: string;
}

@Injectable()
export class PaymentReconciliationService {
  private readonly logger = new Logger(PaymentReconciliationService.name);

  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly razorpayService: RazorpayService,
    private readonly paymentConfirmation: PaymentConfirmationService,
  ) {}

  async getReconciliationReport(query?: {
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const page = Math.max(1, query?.page ?? 1);
    const limit = Math.min(100, Math.max(1, query?.limit ?? 50));
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (query?.startDate || query?.endDate) {
      where.createdAt = {};
      if (query.startDate) (where.createdAt as Record<string, Date>).gte = query.startDate;
      if (query.endDate) (where.createdAt as Record<string, Date>).lte = query.endDate;
    } else {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 90);
      where.createdAt = { gte: start, lte: end };
    }

    const [items, total, unmatchedManual] = await Promise.all([
      this.prismaRead.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          externalId: true,
          amount: true,
          currency: true,
          status: true,
          externalStatus: true,
          method: true,
          createdAt: true,
          paidAt: true,
        },
      }),
      this.prismaRead.payment.count({ where }),
      this.prismaRead.payment.count({
        where: {
          ...where,
          externalId: null,
          status: { in: [PaymentStatus.COMPLETED, PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
        },
      }),
    ]);

    const withProvider = items.filter((p) => p.externalId != null).length;
    const withoutProvider = items.length - withProvider;

    return {
      items,
      summary: {
        total,
        withProviderId: withProvider,
        withoutProviderId: withoutProvider,
        unmatchedManual,
        windowDays: query?.startDate || query?.endDate ? null : 90,
      },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async reconcilePayments(query: ReconciliationQuery) {
    const { startDate, endDate } = query;

    const where: Record<string, unknown> = {
      status: { in: [PaymentStatus.COMPLETED, PaymentStatus.PROCESSING] },
      externalId: { not: null },
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, Date>).gte = startDate;
      if (endDate) (where.createdAt as Record<string, Date>).lte = endDate;
    }

    const payments = await this.prismaRead.payment.findMany({
      where,
      select: {
        id: true,
        externalId: true,
        amount: true,
        status: true,
        externalStatus: true,
      },
    });

    const mismatches: PaymentMismatch[] = [];
    let reconciled = 0;

    for (const payment of payments) {
      if (!payment.externalId) continue;

      try {
        const providerPayment = await this.razorpayService.fetchPayment(payment.externalId);
        const providerAmount =
          typeof providerPayment.amount === 'number' ? providerPayment.amount : NaN;
        const providerStatus = this.mapRazorpayStatus(providerPayment.status);

        const hasAmountMismatch =
          !Number.isFinite(providerAmount) || payment.amount !== providerAmount;
        const hasStatusMismatch =
          payment.status !== providerStatus && payment.externalStatus !== providerPayment.status;

        if (hasAmountMismatch || hasStatusMismatch) {
          const discrepancies: string[] = [];
          if (hasAmountMismatch) discrepancies.push('amount');
          if (hasStatusMismatch) discrepancies.push('status');

          mismatches.push({
            paymentId: payment.id,
            localStatus: payment.status,
            providerStatus: providerPayment.status,
            localAmount: payment.amount,
            providerAmount,
            discrepancy: discrepancies.join(', '),
          });
        } else {
          if (payment.externalStatus !== providerPayment.status) {
            await this.prismaWrite.payment.update({
              where: { id: payment.id },
              data: { externalStatus: providerPayment.status },
            });
          }
          reconciled++;
        }
      } catch {
        mismatches.push({
          paymentId: payment.id,
          localStatus: payment.status,
          providerStatus: 'FETCH_ERROR',
          localAmount: payment.amount,
          providerAmount: 0,
          discrepancy: 'provider_fetch_failed',
        });
      }
    }

    return {
      totalChecked: payments.length,
      reconciled,
      mismatches,
    };
  }

  /** Heal PENDING rows where Razorpay captured but client confirm/webhook missed. */
  async healStalePendingPayments(maxAgeMinutes = 2): Promise<{ healed: number; checked: number }> {
    const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
    const stale = await this.prismaRead.payment.findMany({
      where: {
        status: { in: [PaymentStatus.PENDING, PaymentStatus.CREATED, PaymentStatus.PROCESSING] },
        intentId: { not: null },
        updatedAt: { lt: cutoff },
      },
      select: { id: true, intentId: true },
      take: 25,
      orderBy: { updatedAt: 'asc' },
    });

    let healed = 0;
    for (const payment of stale) {
      const orderId = payment.intentId;
      if (!orderId) continue;

      try {
        const order = await this.razorpayService.fetchOrder(orderId);
        if (order?.status !== 'paid') continue;

        const paymentsList = await this.razorpayService.fetchOrderPayments(orderId);
        const captured = (paymentsList?.items ?? []).find(
          (item: { status?: string; id?: string }) => item.status === 'captured' && item.id,
        );
        if (!captured?.id) continue;

        await this.paymentConfirmation.confirmFromWebhook(orderId, captured.id);
        healed++;
        this.logger.log(`Healed stale PENDING payment ${payment.id} via Razorpay order ${orderId}`);
      } catch (err) {
        this.logger.warn(
          `Stale payment heal skipped for ${payment.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    return { healed, checked: stale.length };
  }

  private mapRazorpayStatus(razorpayStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      created: PaymentStatus.CREATED,
      authorized: PaymentStatus.PROCESSING,
      captured: PaymentStatus.COMPLETED,
      refunded: PaymentStatus.REFUNDED,
      failed: PaymentStatus.FAILED,
    };
    return statusMap[razorpayStatus] || PaymentStatus.PENDING;
  }
}
