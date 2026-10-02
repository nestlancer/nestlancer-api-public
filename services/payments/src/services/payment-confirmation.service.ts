import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';
import { RazorpayService } from './razorpay.service';
import { PaymentGatingService } from './payment-gating.service';
import { PaymentCompletionService, BusinessLogicException, PAYMENT_GATE_ERROR } from '@nestlancer/common';
import { ConfirmPaymentDto } from '../dto/confirm-payment.dto';
import { PaymentStatus } from '@nestlancer/common';

@Injectable()
export class PaymentConfirmationService {
  private readonly logger = new Logger(PaymentConfirmationService.name);

  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly razorpayService: RazorpayService,
    private readonly paymentGating: PaymentGatingService,
    private readonly paymentCompletion: PaymentCompletionService,
  ) {}

  async confirm(userId: string, dto: ConfirmPaymentDto) {
    const isValid = this.razorpayService.verifyPaymentSignature(
      dto.paymentIntentId,
      dto.externalPaymentId,
      dto.signature,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid payment signature');
    }

    const payment = await this.prismaRead.payment.findUnique({
      where: { intentId: dto.paymentIntentId },
    });

    if (!payment) {
      throw new BadRequestException('Payment intent not found');
    }

    if (payment.clientId !== userId) {
      throw new ForbiddenException('Payment does not belong to this account');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      await this.assertCapturedAmountMatches(payment.amount, payment.intentId, dto.externalPaymentId);
    }

    return this.completePayment(payment.id, dto.externalPaymentId, 'razorpay_confirm', {
      skipGating: true,
    });
  }

  /**
   * NL-BUG-PAY-006: a reused Razorpay order can be for a different paise amount than the
   * ledger row. Never mark the obligation paid unless the captured gateway amount matches.
   */
  private async assertCapturedAmountMatches(
    expectedPaise: number,
    expectedOrderId: string | null,
    externalPaymentId: string,
  ): Promise<void> {
    let providerPayment: { amount?: number; order_id?: string } | null = null;
    try {
      providerPayment = await this.razorpayService.fetchPayment(externalPaymentId);
    } catch (error: unknown) {
      this.logger.warn(
        `Could not fetch Razorpay payment ${externalPaymentId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new BusinessLogicException(
        'Payment could not be verified with the payment provider',
        PAYMENT_GATE_ERROR.PROVIDER_REJECTED,
      );
    }

    const captured = typeof providerPayment?.amount === 'number' ? providerPayment.amount : NaN;
    if (!Number.isFinite(captured) || captured !== expectedPaise) {
      throw new BusinessLogicException(
        'Captured amount does not match this payment',
        PAYMENT_GATE_ERROR.INVALID_MILESTONE_AMOUNT,
      );
    }

    const orderId = providerPayment?.order_id;
    if (expectedOrderId && orderId && orderId !== expectedOrderId) {
      throw new BusinessLogicException(
        'Captured payment does not belong to this order',
        PAYMENT_GATE_ERROR.INVALID_MILESTONE_AMOUNT,
      );
    }
  }

  /** Webhook / reconciliation path — signature already verified upstream. */
  async confirmFromWebhook(orderId: string, externalPaymentId: string): Promise<void> {
    const payment = await this.prismaRead.payment.findUnique({
      where: { intentId: orderId },
    });

    if (!payment) {
      this.logger.warn(`Webhook confirm: no payment for order ${orderId}`);
      return;
    }

    await this.assertCapturedAmountMatches(payment.amount, payment.intentId, externalPaymentId);

    await this.completePayment(payment.id, externalPaymentId, 'razorpay_webhook', {
      skipGating: true,
    });
  }

  private async completePayment(
    paymentId: string,
    externalPaymentId: string,
    source: 'razorpay_confirm' | 'razorpay_webhook' | 'reconciliation',
    options?: { skipGating?: boolean },
  ) {
    const payment = await this.prismaRead.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new BadRequestException('Payment not found');
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      return payment;
    }

    if (!options?.skipGating) {
      await this.paymentGating.assertCanCreateIntent(
        payment.clientId,
        payment.projectId,
        payment.milestoneId ?? undefined,
      );
    }

    const paymentWithRelations = await this.prismaRead.payment.findUnique({
      where: { id: payment.id },
      include: {
        client: { select: { email: true, firstName: true, lastName: true } },
        project: { select: { title: true } },
      },
    });

    const updated = await this.prismaWrite.payment.updateMany({
      where: {
        id: payment.id,
        status: { in: [PaymentStatus.PENDING, PaymentStatus.CREATED, PaymentStatus.PROCESSING] },
      },
      data: {
        status: PaymentStatus.COMPLETED,
        externalId: externalPaymentId,
        paidAt: new Date(),
      },
    });

    if (updated.count === 0) {
      const current = await this.prismaRead.payment.findUnique({ where: { id: payment.id } });
      if (current?.status === PaymentStatus.COMPLETED) {
        return current;
      }
      throw new BadRequestException('Payment could not be completed');
    }

    await this.paymentCompletion.finalizeExistingPayment({
      paymentId: payment.id,
      projectId: payment.projectId,
      milestoneId: payment.milestoneId,
      clientId: payment.clientId,
      amount: payment.amount,
      currency: payment.currency,
      clientEmail: paymentWithRelations?.client.email,
      clientName: paymentWithRelations
        ? `${paymentWithRelations.client.firstName} ${paymentWithRelations.client.lastName}`
        : undefined,
      projectTitle: paymentWithRelations?.project.title,
      source,
    });

    return this.prismaRead.payment.findUnique({ where: { id: payment.id } });
  }
}
