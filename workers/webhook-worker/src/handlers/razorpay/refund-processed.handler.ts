import { Injectable } from '@nestjs/common';

import { PrismaWriteService } from '@nestlancer/database';
import { LoggerService } from '@nestlancer/logger';

import { WebhookHandler } from '../../interfaces/webhook-handler.interface';

@Injectable()
export class RefundProcessedHandler implements WebhookHandler {
  constructor(
    private readonly prisma: PrismaWriteService,
    private readonly logger: LoggerService,
  ) {}

  canHandle(provider: string, eventType: string): boolean {
    return provider === 'razorpay' && eventType === 'refund.processed';
  }

  async handle(payload: any): Promise<void> {
    const razorpayRefundId = payload.refund.entity.id;
    const razorpayPaymentId = payload.refund.entity.payment_id;

    const refund = await this.prisma.refund.findFirst({
      where: { externalId: razorpayRefundId },
    });

    if (!refund) return;

    // RefundService already updates payment.amountRefunded synchronously; webhook only
    // confirms final provider status for refunds that were created with externalId.
    await this.prisma.refund.update({
      where: { id: refund.id },
      data: { status: 'PROCESSED', processedAt: new Date() },
    });

    this.logger.log(`Processed refund for payment: ${razorpayPaymentId}`);
  }
}
