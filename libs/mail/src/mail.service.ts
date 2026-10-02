import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import { MailOptions } from './interfaces/mail.interface';
import { renderTemplate } from './templates/handlebars.engine';

/** ZeptoMail SMTP host per account region (signup domain). */
export const ZEPTOMAIL_SMTP_BY_DC: Record<string, string> = {
  us: 'smtp.zeptomail.com',
  in: 'smtp.zeptomail.in',
  eu: 'smtp.zeptomail.eu',
  au: 'smtp.zeptomail.com.au',
  cn: 'smtp.zeptomail.com.cn',
  jp: 'smtp.zeptomail.jp',
  ca: 'smtp.zeptomail.ca',
  uk: 'smtp.zeptomail.uk',
};

export function resolveZeptoSmtpHost(zeptomail?: {
  smtpHost?: string;
  /** @deprecated Use smtpHost — kept for backward compatibility */
  url?: string;
}): string {
  const explicit = process.env.ZEPTOMAIL_SMTP_HOST || zeptomail?.smtpHost || zeptomail?.url;
  if (explicit) {
    return explicit;
  }
  const dc = process.env.ZEPTOMAIL_DC?.toLowerCase();
  if (dc && ZEPTOMAIL_SMTP_BY_DC[dc]) {
    return ZEPTOMAIL_SMTP_BY_DC[dc];
  }
  return 'smtp.zeptomail.com';
}

export interface MailModuleConfig {
  provider?: 'smtp' | 'zeptomail';
  from?: string;
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth?: { user: string; pass: string };
  };
  zeptomail?: { smtpHost?: string; url?: string; token: string };
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter!: Transporter;

  constructor(@Inject('MAIL_OPTIONS') private readonly options: MailModuleConfig) {}

  onModuleInit(): void {
    const provider = this.options.provider || process.env.EMAIL_PROVIDER || 'smtp';

    if (provider === 'smtp') {
      this.transporter = createTransport({
        host: this.options.smtp?.host || process.env.SMTP_HOST || 'localhost',
        port: this.options.smtp?.port || Number(process.env.SMTP_PORT || 587),
        secure: this.options.smtp?.secure ?? process.env.SMTP_SECURE === 'true',
        auth:
          this.options.smtp?.auth ||
          (process.env.SMTP_USER
            ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS || '',
              }
            : undefined),
      });
      this.logger.log('MailService initialized with SMTP transport');
    } else if (provider === 'zeptomail') {
      const token = this.options.zeptomail?.token || process.env.ZEPTOMAIL_TOKEN || '';
      if (!token) {
        throw new Error(
          'ZEPTOMAIL_TOKEN is required when EMAIL_PROVIDER=zeptomail (Agent → SMTP/API → Send Mail Token)',
        );
      }
      const zeptoHost = resolveZeptoSmtpHost(this.options.zeptomail);
      const zeptoPort = Number(process.env.ZEPTOMAIL_SMTP_PORT || 587);
      this.transporter = createTransport({
        host: zeptoHost,
        port: zeptoPort,
        secure: process.env.ZEPTOMAIL_SMTP_SECURE === 'true',
        auth: {
          user: process.env.ZEPTOMAIL_SMTP_USER || 'emailapikey',
          pass: token,
        },
      });
      this.logger.log(
        `MailService initialized with ZeptoMail transport (${zeptoHost}:${zeptoPort})`,
      );
    } else {
      this.logger.warn(`Unknown email provider: ${provider}, falling back to SMTP`);
      this.transporter = createTransport({
        host: 'localhost',
        port: 587,
      });
    }
  }

  async send(mail: MailOptions): Promise<{ messageId: string }> {
    const from = mail.from || this.options.from || 'noreply@nestlancer.com';

    this.logger.log(`Sending email to ${mail.to}: ${mail.subject}`);

    const result = await this.transporter.sendMail({
      from,
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      cc: mail.cc?.join(', '),
      bcc: mail.bcc?.join(', '),
      replyTo: mail.replyTo,
      attachments: mail.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });

    this.logger.debug(`Email sent: ${result.messageId}`);
    return { messageId: result.messageId };
  }

  async sendTemplate(
    templateName: string,
    to: string,
    variables: Record<string, string>,
    subject?: string,
  ): Promise<{ messageId: string }> {
    this.logger.log(`Sending template '${templateName}' to ${to}`);

    // Load template from templates directory or use inline
    const templateHtml = this.getTemplateContent(templateName);
    const html = renderTemplate(templateHtml, variables);

    return this.send({
      to,
      subject: subject || templateName,
      html,
    });
  }

  private getTemplateContent(templateName: string): string {
    // Template mapping for common email templates
    const templates: Record<string, string> = {
      welcome: '<h1>Welcome to Nestlancer, {{name}}!</h1><p>Your account has been created.</p>',
      'reset-password':
        '<h1>Reset Your Password</h1><p>Click <a href="{{resetUrl}}">here</a> to reset your password.</p><p>This link expires in {{expiry}}.</p>',
      'verify-email':
        '<h1>Verify Your Email</h1><p>Click <a href="{{verifyUrl}}">here</a> to verify your email address.</p>',
      invoice:
        '<h1>Invoice #{{invoiceNumber}}</h1><p>Amount: {{amount}}</p><p>Due: {{dueDate}}</p>',
      'payment-receipt':
        '<h1>Payment Received</h1><p>Amount: {{amount}}</p><p>Transaction: {{transactionId}}</p>',
      'project-update': '<h1>Project Update: {{projectTitle}}</h1><p>{{message}}</p>',
    };

    return templates[templateName] || `<h1>{{subject}}</h1><p>{{body}}</p>`;
  }
}
