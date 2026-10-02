import { Injectable } from '@nestjs/common';

import { PrismaWriteService } from '@nestlancer/database';
import { LoggerService } from '@nestlancer/logger';

import { WebhookHandler } from '../../interfaces/webhook-handler.interface';

@Injectable()
export class DisputeCreatedHandler implements WebhookHandler {
  constructor(
    private readonly prisma: PrismaWriteService,
    private readonly logger: LoggerService,
  ) {}

  canHandle(provider: string, eventType: string): boolean {
    return provider === 'razorpay' && eventType === 'dispute.created';
  }

  async handle(payload: any): Promise<void> {
    const disputeEntity = payload?.payload?.dispute?.entity ?? payload?.dispute?.entity;
    const razorpayDisputeId = disputeEntity?.id;
    const razorpayPaymentId = disputeEntity?.payment_id;

    const payment = await this.prisma.payment.findFirst({
      where: { externalId: razorpayPaymentId },
    });

    if (!payment) return;

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'DISPUTED' },
      }),
      this.prisma.dispute.create({
        data: {
          externalId: razorpayDisputeId,
          paymentId: payment.id,
          reason: payload.dispute?.entity?.reason ?? disputeEntity?.reason,
          amount: (disputeEntity?.amount ?? 0) / 100,
          status: 'OPEN',
          evidenceDueBy: new Date((disputeEntity?.respond_by ?? 0) * 1000),
        },
      }),
    ]);

    this.logger.warn(`Dispute created for payment: ${razorpayPaymentId}`);
  }
}
