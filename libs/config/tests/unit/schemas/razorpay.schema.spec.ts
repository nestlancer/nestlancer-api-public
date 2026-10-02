import { razorpayConfigSchema } from '../../../src/schemas/razorpay.schema';

describe('Razorpay Config Schema', () => {
  it('should fail validation if required fields are missing', () => {
    const result = razorpayConfigSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should pass validation when all required fields are provided', () => {
    const validConfig = {
      RAZORPAY_KEY_ID: 'test_key_id',
      RAZORPAY_KEY_SECRET: 'test_secret',
      RAZORPAY_WEBHOOK_SECRET: 'test_webhook_secret',
    };
    const result = razorpayConfigSchema.safeParse(validConfig);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        ...validConfig,
        RAZORPAY_CURRENCY: 'INR', // Default
      });
    }
  });

  it('should allow overriding currency', () => {
    const validConfig = {
      RAZORPAY_KEY_ID: 'test_key_id',
      RAZORPAY_KEY_SECRET: 'test_secret',
      RAZORPAY_WEBHOOK_SECRET: 'test_webhook_secret',
      RAZORPAY_CURRENCY: 'USD',
    };
    const result = razorpayConfigSchema.safeParse(validConfig);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.RAZORPAY_CURRENCY).toBe('USD');
    }
  });
});
