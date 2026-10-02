import { registerAs } from '@nestjs/config';

export const emailWorkerConfig = registerAs('emailWorker', () => ({
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    queue: 'email.queue',
  },
  provider: process.env.EMAIL_PROVIDER || 'smtp',
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    secure: process.env.SMTP_SECURE === 'true',
  },
  zeptomail: {
    token: process.env.ZEPTOMAIL_TOKEN,
    smtpHost: process.env.ZEPTOMAIL_SMTP_HOST,
    dc: process.env.ZEPTOMAIL_DC,
  },
  from: {
    email: process.env.FROM_EMAIL || 'noreply@nestlancer.com',
    name: process.env.FROM_NAME || 'Nestlancer',
  },
  billingFrom: {
    email: process.env.BILLING_FROM_EMAIL || 'billing@nestlancer.com',
    name: process.env.BILLING_FROM_NAME || 'Nestlancer Billing',
  },
  supportFrom: {
    email: process.env.SUPPORT_FROM_EMAIL || 'support@nestlancer.com',
    name: process.env.SUPPORT_FROM_NAME || 'Nestlancer Support',
  },
  replyTo: process.env.REPLY_TO || 'support@nestlancer.com',
  billingReplyTo: process.env.BILLING_REPLY_TO || process.env.REPLY_TO || 'billing@nestlancer.com',
  contactInboxEmail: process.env.CONTACT_INBOX_EMAIL || 'contact@nestlancer.com',
  concurrency: parseInt(process.env.EMAIL_CONCURRENCY || '5', 10),
  templatesPath:
    process.env.TEMPLATES_PATH ||
    (process.env.NODE_ENV === 'production' ? '/app/src/templates' : './src/templates'),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  idempotencyTtl: parseInt(process.env.EMAIL_IDEMPOTENCY_TTL || '86400', 10),
}));
