import { Injectable, Inject, InternalServerErrorException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import * as crypto from 'crypto';
import paymentsConfig from '../config/payments.config';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Razorpay = require('razorpay');

function razorpayErrorMessage(error: unknown, fallback = 'Unknown Razorpay error'): string {
  if (!error || typeof error !== 'object') return fallback;
  const err = error as Record<string, unknown>;
  const nested = err.error;
  if (nested && typeof nested === 'object') {
    const nestedErr = nested as Record<string, unknown>;
    if (typeof nestedErr.description === 'string' && nestedErr.description.trim()) {
      return nestedErr.description;
    }
    if (typeof nestedErr.reason === 'string' && nestedErr.reason.trim()) {
      return nestedErr.reason;
    }
    if (typeof nestedErr.code === 'string' && nestedErr.code.trim()) {
      return nestedErr.code;
    }
  }
  if (typeof err.description === 'string' && err.description.trim()) return err.description;
  if (typeof err.message === 'string' && err.message.trim()) return err.message;
  return fallback;
}

@Injectable()
export class RazorpayService {
  private instance: any;

  constructor(
    @Inject(paymentsConfig.KEY)
    private readonly config: ConfigType<typeof paymentsConfig>,
  ) {
    this.instance = new Razorpay({
      key_id: this.config.razorpayKeyId,
      key_secret: this.config.razorpayKeySecret,
    });
  }

  /**
   * @param amount Amount in smallest currency unit (paise for INR). Passed through to Razorpay as-is.
   */
  async createOrder(amount: number, currency: string, receipt: string, notes?: any) {
    try {
      const options: Record<string, unknown> = {
        amount: Math.round(amount),
        currency,
        receipt,
        notes,
      };
      const configId = this.config.razorpayCheckoutConfigId?.trim();
      if (configId) {
        options.checkout_config_id = configId;
      }
      const order = await this.instance.orders.create(options);
      return order;
    } catch (error: any) {
      const description = razorpayErrorMessage(error);
      // Client-side amount/validation failures must not become an unhandled 500 that
      // echoes the PSP string (NL-BUG-PAY-006). Callers map this to PAYMENT_GATE_*.
      const clientError = /amount|minimum|maximum/i.test(description);
      if (clientError) {
        throw new InternalServerErrorException(`PAYMENT_PROVIDER_AMOUNT: ${description}`);
      }
      throw new InternalServerErrorException('Failed to create Razorpay order');
    }
  }

  async fetchOrder(orderId: string) {
    try {
      return await this.instance.orders.fetch(orderId);
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Failed to fetch Razorpay order: ${razorpayErrorMessage(error)}`,
      );
    }
  }

  async fetchOrderPayments(orderId: string) {
    try {
      return await this.instance.orders.fetchPayments(orderId);
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Failed to fetch Razorpay order payments: ${razorpayErrorMessage(error)}`,
      );
    }
  }

  async fetchPayment(paymentId: string) {
    try {
      return await this.instance.payments.fetch(paymentId);
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Failed to fetch Razorpay payment: ${razorpayErrorMessage(error)}`,
      );
    }
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.config.razorpayWebhookSecret)
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  }

  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    const text = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', this.config.razorpayKeySecret)
      .update(text)
      .digest('hex');

    return expectedSignature === signature;
  }

  async initiateRefund(paymentId: string, amount?: number, notes?: any) {
    try {
      const options: any = { notes };
      if (amount) {
        options.amount = Math.round(amount);
      }
      return await this.instance.payments.refund(paymentId, options);
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Failed to initiate refund: ${razorpayErrorMessage(error)}`,
      );
    }
  }
}
