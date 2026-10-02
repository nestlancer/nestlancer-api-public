import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { RazorpayService } from './razorpay.service';
import { PaymentConfirmationService } from './payment-confirmation.service';

@Injectable()
export class RazorpayWebhookService {
  private readonly logger = new Logger(RazorpayWebhookService.name);

  constructor(
    private readonly razorpayService: RazorpayService,
    private readonly confirmationService: PaymentConfirmationService,
  ) {}

  async handleWebhook(signature: string, rawBody: string, payload: any) {
    const isValid = this.razorpayService.verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = payload.event;

    switch (event) {
      case 'payment.captured':
        await this.handlePaymentCaptured(payload.payload.payment.entity);
        break;
      case 'payment.failed':
        await this.handlePaymentFailed(payload.payload.payment.entity);
        break;
      case 'refund.processed':
        // Handle refund processed
        break;
      default:
        this.logger.log(`Unhandled webhook event: ${event}`);
    }

    return { received: true };
  }

  private async handlePaymentCaptured(entity: any) {
    const orderId = entity.order_id;
    const paymentId = entity.id;

    if (!orderId || !paymentId) {
      this.logger.error('Missing order_id or payment_id in payment.captured payload');
      return;
    }

    try {
      await this.confirmationService.confirmFromWebhook(orderId, paymentId);
    } catch (error: any) {
      this.logger.error(`Error processing webhook payment.captured: ${error.message}`);
    }
  }

  private async handlePaymentFailed(entity: any) {
    this.logger.log(`Payment failed: ${entity.id}`);
  }
}
