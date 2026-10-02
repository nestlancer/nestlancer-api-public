import { registerAs } from '@nestjs/config';
import { DEFAULT_CURRENCY } from '@nestlancer/common';

export default registerAs('payments', () => ({
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkey',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_mocksecret',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'mockwebhooksecret',
  /** Optional Razorpay Dashboard Payment Configuration ID (enables UPI ID/Number, method order). */
  razorpayCheckoutConfigId: process.env.RAZORPAY_CHECKOUT_CONFIG_ID || '',
  defaultCurrency: process.env.DEFAULT_CURRENCY || DEFAULT_CURRENCY,
  supportedCurrencies: (process.env.SUPPORTED_CURRENCIES || DEFAULT_CURRENCY).split(','),
  receiptPdfPrefix: process.env.RECEIPT_PDF_PREFIX || 'RCPT-',
  invoicePdfPrefix: process.env.INVOICE_PDF_PREFIX || 'INV-',
}));
