import type { EmailSenderProfile } from './email-job.interface';

export interface EmailSenderConfig {
  defaultFromEmail: string;
  defaultFromName: string;
  billingFromEmail: string;
  billingFromName: string;
  supportFromEmail: string;
  supportFromName: string;
  replyTo: string;
  billingReplyTo: string;
  contactInboxEmail: string;
  frontendUrl: string;
}

export function loadEmailSenderConfig(): EmailSenderConfig {
  const defaultFromEmail = process.env.FROM_EMAIL || 'noreply@nestlancer.com';
  const defaultFromName = process.env.FROM_NAME || 'Nestlancer';

  return {
    defaultFromEmail,
    defaultFromName,
    billingFromEmail: process.env.BILLING_FROM_EMAIL || 'billing@nestlancer.com',
    billingFromName: process.env.BILLING_FROM_NAME || 'Nestlancer Billing',
    supportFromEmail: process.env.SUPPORT_FROM_EMAIL || 'support@nestlancer.com',
    supportFromName: process.env.SUPPORT_FROM_NAME || 'Nestlancer Support',
    replyTo: process.env.REPLY_TO || 'support@nestlancer.com',
    billingReplyTo:
      process.env.BILLING_REPLY_TO || process.env.REPLY_TO || 'billing@nestlancer.com',
    contactInboxEmail: process.env.CONTACT_INBOX_EMAIL || 'contact@nestlancer.com',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  };
}

export function resolveEmailFrom(
  profile: EmailSenderProfile | undefined,
  config: EmailSenderConfig,
): string {
  switch (profile) {
    case 'billing':
      return `${config.billingFromName} <${config.billingFromEmail}>`;
    case 'support':
      return `${config.supportFromName} <${config.supportFromEmail}>`;
    default:
      return `${config.defaultFromName} <${config.defaultFromEmail}>`;
  }
}

export function resolveEmailReplyTo(
  job: { senderProfile?: EmailSenderProfile; replyTo?: string },
  config: EmailSenderConfig,
): string | undefined {
  if (job.replyTo) return job.replyTo;
  if (job.senderProfile === 'billing') return config.billingReplyTo;
  return config.replyTo || undefined;
}
