import { z } from 'zod';

export const razorpayConfigSchema = z.object({
  RAZORPAY_KEY_ID: z.string(),
  RAZORPAY_KEY_SECRET: z.string(),
  RAZORPAY_WEBHOOK_SECRET: z.string(),
  RAZORPAY_CURRENCY: z.string().default('INR'),
});

export type RazorpayConfig = z.infer<typeof razorpayConfigSchema>;
