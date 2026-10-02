import { smtpConfigSchema } from '../../../src/schemas/smtp.schema';

describe('SMTP Config Schema', () => {
  it('should populate default values', () => {
    const result = smtpConfigSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        EMAIL_PROVIDER: 'smtp',
        SMTP_HOST: 'localhost',
        SMTP_PORT: 587,
        SMTP_SECURE: false,
      });
    }
  });

  it('should correctly transform SMTP_SECURE boolean string', () => {
    const resultTrue = smtpConfigSchema.safeParse({ SMTP_SECURE: 'true' });
    const resultFalse = smtpConfigSchema.safeParse({ SMTP_SECURE: 'false' });

    expect(resultTrue.success && resultTrue.data.SMTP_SECURE).toBe(true);
    expect(resultFalse.success && resultFalse.data.SMTP_SECURE).toBe(false);
  });

  it('should coerce SMTP_PORT to number', () => {
    const result = smtpConfigSchema.safeParse({ SMTP_PORT: '465' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.SMTP_PORT).toBe(465);
    }
  });

  it('should validate EMAIL_PROVIDER enum', () => {
    const validResult = smtpConfigSchema.safeParse({
      EMAIL_PROVIDER: 'zeptomail',
      ZEPTOMAIL_TOKEN: 'test-token',
      ZEPTOMAIL_SMTP_HOST: 'smtp.zeptomail.in',
    });
    expect(validResult.success).toBe(true);

    const invalidResult = smtpConfigSchema.safeParse({ EMAIL_PROVIDER: 'invalid_provider' });
    expect(invalidResult.success).toBe(false);
  });

  it('should require ZEPTOMAIL_TOKEN when provider is zeptomail', () => {
    const result = smtpConfigSchema.safeParse({ EMAIL_PROVIDER: 'zeptomail' });
    expect(result.success).toBe(false);
  });

  it('should accept ZEPTOMAIL_DC region shorthand', () => {
    const result = smtpConfigSchema.safeParse({
      EMAIL_PROVIDER: 'zeptomail',
      ZEPTOMAIL_TOKEN: 'tok',
      ZEPTOMAIL_DC: 'in',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ZEPTOMAIL_DC).toBe('in');
    }
  });
});
