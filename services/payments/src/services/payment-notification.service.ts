import { Injectable, Logger } from '@nestjs/common';

/**
 * Payment in-app notifications are delivered via outbox → notification-worker.
 * @see PAYMENT_REQUESTED / PAYMENT_REMINDER outbox events and payment.due mapper.
 */
@Injectable()
export class PaymentNotificationService {
  private readonly logger = new Logger(PaymentNotificationService.name);

  async notifyPaymentRequested(_params: {
    clientId: string;
    projectId: string;
    milestoneName?: string | null;
    amount: number;
    currency: string;
  }): Promise<void> {
    this.logger.debug(
      'notifyPaymentRequested: in-app delivery handled by notification-worker (PAYMENT_REQUESTED outbox)',
    );
  }

  async notifyPaymentReminder(_params: {
    clientId: string;
    projectId: string;
    paymentId: string;
    milestoneName?: string | null;
  }): Promise<void> {
    this.logger.debug(
      'notifyPaymentReminder: in-app delivery handled by notification-worker (PAYMENT_REMINDER outbox)',
    );
  }
}
