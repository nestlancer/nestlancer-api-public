import { Injectable } from '@nestjs/common';

import { EXCHANGE_EVENTS } from '@nestlancer/common';
import { PrismaWriteService } from '@nestlancer/database';
import { LoggerService } from '@nestlancer/logger';
import { QueuePublisherService } from '@nestlancer/queue';

import { WebhookHandler } from '../../interfaces/webhook-handler.interface';

@Injectable()
export class PaymentFailedHandler implements WebhookHandler {
  constructor(
    private readonly prisma: PrismaWriteService,
    private readonly logger: LoggerService,
    private readonly queue: QueuePublisherService,
  ) {}

  canHandle(provider: string, eventType: string): boolean {
    return provider === 'razorpay' && eventType === 'payment.failed';
  }

  async handle(payload: any): Promise<void> {
    const entity = payload?.payload?.payment?.entity ?? payload?.payment?.entity;
    const razorpayPaymentId = entity?.id as string | undefined;
    const reason = entity?.error_description;

    const payment = await this.prisma.payment.findFirst({
      where: { externalId: razorpayPaymentId },
    });

    if (!payment) return;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', failureReason: reason },
    });

    await this.queue.publish(EXCHANGE_EVENTS, 'payment.payment.failed', {
      paymentId: payment.id,
      clientId: payment.clientId,
      userId: payment.clientId,
      reason,
    });
  }
}
