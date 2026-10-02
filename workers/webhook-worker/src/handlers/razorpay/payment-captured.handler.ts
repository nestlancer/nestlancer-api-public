import { Injectable } from '@nestjs/common';

import { PaymentCompletionService } from '@nestlancer/common';
import { PrismaWriteService } from '@nestlancer/database';
import { LoggerService } from '@nestlancer/logger';

import { WebhookHandler } from '../../interfaces/webhook-handler.interface';

@Injectable()
export class PaymentCapturedHandler implements WebhookHandler {
  constructor(
    private readonly prisma: PrismaWriteService,
    private readonly logger: LoggerService,
    private readonly paymentCompletion: PaymentCompletionService,
  ) {}

  canHandle(provider: string, eventType: string): boolean {
    return provider === 'razorpay' && eventType === 'payment.captured';
  }

  async handle(payload: any): Promise<void> {
    const entity = payload?.payload?.payment?.entity ?? payload?.payment?.entity;
    const razorpayPaymentId = entity?.id as string | undefined;
    const orderId = entity?.order_id as string | undefined;

    if (!razorpayPaymentId) {
      this.logger.error('payment.captured webhook missing payment.entity.id');
      return;
    }

    this.logger.log(`Handling payment.captured for Razorpay ID: ${razorpayPaymentId}`);

    const payment = await this.findPayment(razorpayPaymentId, orderId);

    if (!payment) {
      this.logger.error(
        `Payment not found for Razorpay ID ${razorpayPaymentId}` +
          (orderId ? ` or order_id ${orderId}` : ''),
      );
      return;
    }

    if (payment.status === 'COMPLETED') {
      this.logger.warn(`Payment ${payment.id} already captured, skipping.`);
      return;
    }

    const paymentWithRelations = await this.prisma.payment.findUnique({
      where: { id: payment.id },
      include: {
        client: { select: { email: true, firstName: true, lastName: true } },
        project: { select: { title: true } },
      },
    });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        externalId: razorpayPaymentId,
        paidAt: new Date(),
      },
    });

    await this.paymentCompletion.finalizeExistingPayment({
      paymentId: payment.id,
      projectId: payment.projectId,
      milestoneId: payment.milestoneId,
      amount: payment.amount,
      currency: payment.currency,
      clientId: payment.clientId,
      clientEmail: paymentWithRelations?.client?.email,
      clientName: paymentWithRelations?.client
        ? `${paymentWithRelations.client.firstName} ${paymentWithRelations.client.lastName}`
        : undefined,
      projectTitle: paymentWithRelations?.project?.title,
      source: 'razorpay_webhook',
    });
  }

  private async findPayment(razorpayPaymentId: string, orderId?: string) {
    const byExternalId = await this.prisma.payment.findFirst({
      where: { externalId: razorpayPaymentId },
    });
    if (byExternalId) return byExternalId;

    if (orderId) {
      return this.prisma.payment.findFirst({
        where: { intentId: orderId },
      });
    }

    return null;
  }
}
