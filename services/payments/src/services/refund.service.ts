import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { RazorpayService } from './razorpay.service';
import { ProcessRefundDto } from '../dto/process-refund.dto';
import { PaymentStatus } from '@nestlancer/common';

/** Seeded dev payments use fake provider IDs that Razorpay will reject. */
const SEED_EXTERNAL_ID_PATTERN = /^(pay_test_|pay_seed_|rfnd_seed_|seed-)/i;

@Injectable()
export class RefundService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly razorpayService: RazorpayService,
  ) {}

  async processRefund(paymentId: string, adminId: string, dto: ProcessRefundDto) {
    const payment = await this.prismaRead.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Only completed payments can be refunded');
    }

    const amountToRefund = dto.amount || payment.amount;

    if (payment.amountRefunded + amountToRefund > payment.amount) {
      throw new BadRequestException('Refund amount exceeds total payment amount');
    }

    const method = String((payment as { method?: string }).method ?? '').toLowerCase();
    const isOfflineRail =
      !payment.externalId ||
      SEED_EXTERNAL_ID_PATTERN.test(payment.externalId) ||
      ['manual', 'bank_transfer', 'bank', 'offline', 'cash'].includes(method);

    // NL-BUG-PAY-004: manual/bank/offline inflows have no PSP id — record a ledger refund.
    if (isOfflineRail) {
      if (!dto.reason?.trim()) {
        throw new BadRequestException(
          'A reason is required for offline/manual refunds (no payment provider to reverse)',
        );
      }
      return this.recordLedgerRefund(payment, adminId, amountToRefund, dto.reason.trim(), {
        offline: true,
        method: method || 'manual',
      }, Boolean(dto.amount && amountToRefund < payment.amount));
    }

    try {
      const razorpayRefund = await this.razorpayService.initiateRefund(
        payment.externalId!,
        amountToRefund,
        {
          reason: dto.reason,
        },
      );

      const razorpayRefundId =
        typeof razorpayRefund?.id === 'string' ? razorpayRefund.id : undefined;
      const refundStatus =
        razorpayRefund?.status === 'processed' || razorpayRefund?.status === 'completed'
          ? 'PROCESSED'
          : 'PENDING';

      return this.recordLedgerRefund(
        payment,
        adminId,
        amountToRefund,
        dto.reason,
        {
          externalId: razorpayRefundId,
          status: refundStatus,
          providerDetails: razorpayRefund,
          processedAt: refundStatus === 'PROCESSED' ? new Date() : undefined,
        },
        Boolean(dto.amount && amountToRefund < payment.amount),
      );
    } catch (error: any) {
      const message =
        typeof error?.message === 'string' && error.message.trim()
          ? error.message
          : 'Refund failed';
      throw new InternalServerErrorException(message);
    }
  }

  private async recordLedgerRefund(
    payment: {
      id: string;
      clientId: string;
      amount: number;
      amountRefunded: number;
      currency: string;
    },
    adminId: string,
    amountToRefund: number,
    reason: string | undefined,
    extras: {
      offline?: boolean;
      method?: string;
      externalId?: string;
      status?: string;
      providerDetails?: unknown;
      processedAt?: Date;
    },
    isPartial = false,
  ) {
    const remaining = payment.amount - payment.amountRefunded;
    const refundType = isPartial || amountToRefund < remaining ? 'PARTIAL' : 'FULL';
    const refundStatus = extras.status ?? 'PROCESSED';

    return this.prismaWrite.$transaction(async (tx: any) => {
      await tx.refund.create({
        data: {
          paymentId: payment.id,
          externalId: extras.externalId,
          amount: amountToRefund,
          currency: payment.currency,
          type: refundType,
          reason: reason,
          status: refundStatus,
          processedAt: extras.processedAt ?? (refundStatus === 'PROCESSED' ? new Date() : undefined),
          providerDetails: extras.providerDetails ?? {
            offline: extras.offline === true,
            recordedBy: adminId,
            method: extras.method,
          },
        },
      });

      const newAmountRefunded = payment.amountRefunded + amountToRefund;
      const newStatus =
        newAmountRefunded >= payment.amount ? PaymentStatus.REFUNDED : PaymentStatus.COMPLETED;

      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          amountRefunded: newAmountRefunded,
          status: newStatus,
          refundStatus: refundType,
        },
      });

      await tx.outbox.create({
        data: {
          type: 'PAYMENT_REFUNDED',
          aggregateType: 'PAYMENT',
          aggregateId: payment.id,
          payload: {
            paymentId: payment.id,
            clientId: payment.clientId,
            userId: payment.clientId,
            amount: amountToRefund,
            currency: payment.currency,
            reason,
            offline: extras.offline === true,
            recordedBy: adminId,
          },
        },
      });

      return updatedPayment;
    });
  }
}
