import { z } from 'zod';

const zeptoDc = z.enum(['us', 'in', 'eu', 'au', 'cn', 'jp', 'ca', 'uk']);

export const smtpConfigSchema = z
  .object({
    EMAIL_PROVIDER: z.enum(['smtp', 'zeptomail']).default('smtp'),
    SMTP_HOST: z.string().default('localhost'),
    SMTP_PORT: z.coerce.number().default(587),
    SMTP_SECURE: z
      .string()
      .transform((v) => v === 'true')
      .default('false'),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    FROM_EMAIL: z.string().email().optional(),
    FROM_NAME: z.string().optional(),
    REPLY_TO: z.string().email().optional(),
    BILLING_FROM_EMAIL: z.string().email().optional(),
    BILLING_FROM_NAME: z.string().optional(),
    BILLING_REPLY_TO: z.string().email().optional(),
    SUPPORT_FROM_EMAIL: z.string().email().optional(),
    SUPPORT_FROM_NAME: z.string().optional(),
    CONTACT_INBOX_EMAIL: z.string().email().optional(),
    /** Region fallback when ZEPTOMAIL_SMTP_HOST is unset (in → smtp.zeptomail.in, etc.) */
    ZEPTOMAIL_DC: zeptoDc.optional(),
    ZEPTOMAIL_SMTP_HOST: z.string().optional(),
    ZEPTOMAIL_SMTP_PORT: z.coerce.number().optional(),
    ZEPTOMAIL_SMTP_USER: z.string().optional(),
    ZEPTOMAIL_SMTP_SECURE: z
      .string()
      .transform((v) => v === 'true')
      .optional(),
    /** Legacy / unused by MailService — prefer ZEPTOMAIL_SMTP_HOST */
    ZEPTOMAIL_URL: z.string().optional(),
    ZEPTOMAIL_TOKEN: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.EMAIL_PROVIDER === 'zeptomail' && !data.ZEPTOMAIL_TOKEN?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'ZEPTOMAIL_TOKEN is required when EMAIL_PROVIDER=zeptomail',
        path: ['ZEPTOMAIL_TOKEN'],
      });
    }
  });

export type SmtpConfig = z.infer<typeof smtpConfigSchema>;
