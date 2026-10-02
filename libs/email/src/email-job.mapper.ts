import { EmailJob, EmailJobType, isEmailJob } from './email-job.interface';
import { loadEmailSenderConfig } from './email-sender.config';

export interface EmailJobMapperContext {
  frontendUrl?: string;
  contactInboxEmail?: string;
}

function buildVerificationUrl(token: string, frontendUrl: string): string {
  const base = frontendUrl.replace(/\/$/, '');
  return `${base}/verify-email?token=${encodeURIComponent(token)}`;
}

function buildPasswordResetUrl(token: string, frontendUrl: string): string {
  const base = frontendUrl.replace(/\/$/, '');
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}

/**
 * Maps RabbitMQ routing keys and legacy event payloads to normalized EmailJob messages.
 */
export function mapToEmailJobs(
  routingKey: string | undefined,
  raw: unknown,
  ctx: EmailJobMapperContext = {},
): EmailJob[] {
  if (!raw || typeof raw !== 'object') return [];

  const payload = raw as Record<string, unknown>;
  if (isEmailJob(payload)) {
    return [payload];
  }

  const config = loadEmailSenderConfig();
  const frontendUrl = ctx.frontendUrl || config.frontendUrl;
  const contactInbox = ctx.contactInboxEmail || config.contactInboxEmail;

  const key = routingKey || '';

  if (key === 'email.contact-response' || (payload.email && payload.message && payload.ticketId)) {
    const email = String(payload.email || '');
    if (!email) return [];
    return [
      {
        type: EmailJobType.CONTACT_RESPONSE,
        to: email,
        senderProfile: 'support',
        replyTo: config.replyTo,
        data: {
          name: payload.name,
          subject: payload.subject,
          message: payload.message,
          ticketId: payload.ticketId,
        },
      },
    ];
  }

  if (
    key === 'contact.message.received' ||
    (payload.contactId && payload.email && payload.message && payload.ticketId)
  ) {
    const visitorEmail = String(payload.email || '');
    const jobs: EmailJob[] = [];
    if (visitorEmail) {
      jobs.push({
        type: EmailJobType.CONTACT_RECEIVED,
        to: visitorEmail,
        senderProfile: 'default',
        replyTo: config.replyTo,
        data: {
          name: payload.name,
          ticketId: payload.ticketId,
          subject: payload.subject,
        },
      });
    }
    jobs.push({
      type: EmailJobType.CONTACT_INQUIRY,
      to: contactInbox,
      senderProfile: 'default',
      replyTo: visitorEmail || config.replyTo,
      data: {
        name: payload.name,
        email: payload.email,
        subject: payload.subject,
        message: payload.message,
        ticketId: payload.ticketId,
        contactId: payload.contactId,
      },
    });
    return jobs;
  }

  if (key === 'auth.user.registered' || payload.verificationToken) {
    const email = String(payload.email || '');
    const token = String(payload.verificationToken || payload.token || '');
    if (!email || !token) return [];
    return [
      {
        type: EmailJobType.VERIFICATION,
        to: email,
        data: {
          userName: payload.firstName || payload.name || 'there',
          verificationUrl: buildVerificationUrl(token, frontendUrl),
          expiresIn: '24 hours',
        },
      },
    ];
  }

  if (key === 'auth.password.reset_requested' || payload.resetToken) {
    const email = String(payload.email || '');
    const token = String(payload.resetToken || payload.token || '');
    if (!email || !token) return [];
    return [
      {
        type: EmailJobType.PASSWORD_RESET,
        to: email,
        data: {
          userName: payload.firstName || 'there',
          resetUrl: buildPasswordResetUrl(token, frontendUrl),
          expiresIn: '1 hour',
        },
      },
    ];
  }

  if (key === 'email.welcome' || payload.emailVerified) {
    const email = String(payload.email || '');
    if (!email) return [];
    return [
      {
        type: EmailJobType.WELCOME,
        to: email,
        data: {
          userName: payload.firstName || payload.name || 'there',
          loginUrl: `${frontendUrl.replace(/\/$/, '')}/login`,
          dashboardUrl: `${frontendUrl.replace(/\/$/, '')}/dashboard`,
        },
      },
    ];
  }

  if (key === 'payment.payment.completed' || key === 'PAYMENT_COMPLETED') {
    const email = String(payload.clientEmail || payload.email || '');
    if (!email) return [];
    return [
      {
        type: EmailJobType.PAYMENT_RECEIVED,
        to: email,
        senderProfile: 'billing',
        data: {
          userName: payload.clientName || payload.firstName || 'there',
          amount: payload.amount,
          currency: payload.currency || 'INR',
          projectTitle: payload.projectTitle || payload.projectName || 'your project',
          receiptNumber: payload.paymentId || payload.receiptNumber,
          receiptLink: payload.receiptLink,
        },
      },
    ];
  }

  if (key === 'payment.payment.initiated') {
    const email = String(payload.clientEmail || payload.email || '');
    if (!email) return [];
    return [
      {
        type: EmailJobType.NOTIFICATION,
        to: email,
        senderProfile: 'billing',
        data: {
          title: 'Payment requested',
          body: `A payment of ${payload.amount} ${payload.currency || 'INR'} has been requested.`,
          link: `${frontendUrl.replace(/\/$/, '')}/payments`,
        },
      },
    ];
  }

  if (key === 'payment.payment.reminder') {
    const email = String(payload.clientEmail || payload.email || '');
    if (!email) return [];
    return [
      {
        type: EmailJobType.NOTIFICATION,
        to: email,
        senderProfile: 'billing',
        data: {
          title: 'Payment reminder',
          body: payload.message || 'You have an overdue payment on your account.',
          link: `${frontendUrl.replace(/\/$/, '')}/payments`,
        },
      },
    ];
  }

  if (key === 'quote.quote.sent' || key === 'QUOTE_SENT') {
    const email = String(payload.clientEmail || payload.email || '');
    if (!email) return [];
    const quoteId = payload.quoteId || payload.aggregateId || '';
    const pdfUrl = payload.pdfDownloadUrl || payload.quotePdfUrl;
    const job: any = {
      type: EmailJobType.QUOTE_SENT,
      to: email,
      data: {
        userName: payload.clientName || payload.firstName || 'there',
        projectTitle: payload.projectTitle || 'your project',
        amount: payload.amount,
        link: `${frontendUrl.replace(/\/$/, '')}/quotes/${quoteId}`,
        validUntil: payload.validUntil,
        documentNumber: payload.quoteNumber || payload.documentNumber,
      },
    };
    if (pdfUrl) {
      job.attachments = [
        {
          filename: `quote-${payload.quoteNumber || quoteId}.pdf`,
          url: pdfUrl,
          contentType: 'application/pdf',
        },
      ];
    }
    return [job];
  }

  if (key === 'quote.quote.accepted' || key === 'QUOTE_ACCEPTED') {
    const email = String(payload.clientEmail || payload.email || '');
    if (!email) return [];
    return [
      {
        type: EmailJobType.QUOTE_ACCEPTED,
        to: email,
        data: {
          userName: payload.clientName || 'there',
          projectTitle: payload.projectTitle || 'your project',
        },
      },
    ];
  }

  if (key === 'project.project.completed') {
    const email = String(payload.clientEmail || payload.email || '');
    if (!email) return [];
    return [
      {
        type: EmailJobType.PROJECT_COMPLETED,
        to: email,
        data: {
          userName: payload.clientName || 'there',
          projectName: payload.projectName || payload.projectTitle,
        },
      },
    ];
  }

  if (key === 'message.message.sent') {
    const email = String(payload.recipientEmail || payload.email || '');
    if (!email) return [];
    return [
      {
        type: EmailJobType.NOTIFICATION,
        to: email,
        data: {
          title: 'New message',
          body: 'You have a new message. Open the app to read it.',
          link: payload.link || frontendUrl,
          projectTitle: payload.projectTitle,
          senderName: payload.senderName,
        },
      },
    ];
  }

  return [];
}

export function emailJobTemplateName(type: string): string {
  return type.toLowerCase().replace(/_/g, '_');
}
