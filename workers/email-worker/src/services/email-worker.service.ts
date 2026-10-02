import * as crypto from 'crypto';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CacheService } from '@nestlancer/cache';
import { resolveEmailFrom, resolveEmailReplyTo, loadEmailSenderConfig } from '@nestlancer/email';
import { MailService } from '@nestlancer/mail';

import { EmailRendererService } from './email-renderer.service';
import { EmailRetryService } from './email-retry.service';
import { EmailJob } from '../interfaces/email-job.interface';

/**
 * Orchestrator service for the Email Worker.
 * Handles template selection, rendering, and dispatching emails via SMTP.
 * Implements a retry mechanism for failed delivery attempts.
 * Now includes an idempotency layer to prevent duplicate sends.
 */
@Injectable()
export class EmailWorkerService {
  private readonly logger = new Logger(EmailWorkerService.name);

  constructor(
    private readonly mailService: MailService,
    private readonly emailRenderer: EmailRendererService,
    private readonly configService: ConfigService,
    private readonly retryService: EmailRetryService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Processes a single email job from the queue.
   * Renders the appropriate template, determines the subject, and sends the mail.
   *
   * @param job - The email job payload containing recipient and data
   * @returns A promise that resolves when the email is sent or scheduled for retry
   */
  async processEmail(job: EmailJob): Promise<void> {
    const { type, to, data, attachments } = job;

    // Idempotency check
    const idempotencyKey = this.generateIdempotencyKey(job);
    const cacheKey = `email_idempotency:${idempotencyKey}`;

    try {
      if (await this.cacheService.exists(cacheKey)) {
        this.logger.log(`[EmailWorker] Skipping duplicate email for key: ${idempotencyKey}`);
        return;
      }

      this.logger.log(`[EmailWorker] Processing notification: Type=${type} | To=${to}`);

      const html = await this.emailRenderer.render(type.toLowerCase(), {
        ...this.getCommonData(),
        ...data,
      });

      const subject = this.getSubjectForType(type, data);

      const senderConfig = loadEmailSenderConfig();
      const from = resolveEmailFrom(job.senderProfile, senderConfig);
      const replyTo =
        resolveEmailReplyTo(job, senderConfig) ||
        this.configService.get<string>('emailWorker.replyTo') ||
        undefined;

      await this.mailService.send({
        to,
        subject,
        html,
        from,
        replyTo,
        attachments: attachments as any,
      });

      // Mark as processed
      const ttl = this.configService.get('emailWorker.idempotencyTtl') || 86400;
      await this.cacheService.set(cacheKey, { processedAt: new Date().toISOString() }, ttl);

      this.logger.log(`[EmailWorker] Successfully sent email: ${type} -> ${to}`);
    } catch (error: any) {
      this.logger.error(
        `[EmailWorker] Failed to deliver email ${type} to ${to}: ${error.message}`,
        error.stack,
      );
      await this.retryService.handleFailure(
        this.configService.get('emailWorker.rabbitmq.queue') || 'email.queue',
        job,
        error,
      );
    }
  }

  /**
   * Generates a unique idempotency key for the email job.
   */
  private generateIdempotencyKey(job: EmailJob): string {
    const payload = JSON.stringify({
      type: job.type,
      to: job.to,
      data: job.data,
      // We don't include attachments in the hash as they might be large
      // but usually the combination of type, to, and data is unique enough.
    });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Aggregates common data required by almost all email templates.
   *
   * @returns An object containing common template variables
   */
  private getCommonData(): Record<string, any> {
    const frontendUrl = (
      this.configService.get<string>('emailWorker.frontendUrl') || 'https://app.nestlancer.com'
    ).replace(/\/$/, '');

    return {
      currentYear: new Date().getFullYear(),
      // Brand wordmark in body/footer — not the SMTP FROM_NAME ("Nestlancer Prod").
      companyName: 'Nestlancer',
      supportEmail:
        this.configService.get('emailWorker.replyTo') ||
        this.configService.get('emailWorker.from.email'),
      // PNG (not SVG) — most email clients block or poorly render SVG logos.
      logoUrl: `${frontendUrl}/logos/logo-email.png`,
      siteUrl: frontendUrl,
    };
  }

  /**
   * Maps email job types to human-readable subject lines.
   *
   * @param type - The EmailJobType string
   * @param data - Job data, used for dynamic subject lines (e.g., project name)
   * @returns A string representing the email subject
   */
  private getSubjectForType(type: string, data: any): string {
    switch (type) {
      case 'EMAIL_VERIFICATION':
        return 'Verify your email address';
      case 'PASSWORD_RESET':
        return 'Reset your password';
      case 'WELCOME':
        return 'Welcome to Nestlancer!';
      case 'QUOTE_SENT':
        return 'New Quote Received';
      case 'QUOTE_ACCEPTED':
        return 'Quote Accepted';
      case 'PAYMENT_RECEIVED':
        return 'Payment Received';
      case 'PAYMENT_FAILED':
        return 'Payment Failed';
      case 'PAYMENT_REFUND':
        return 'Refund Processed';
      case 'PROJECT_UPDATE':
        return `Project Update: ${data.projectName}`;
      case 'PROJECT_COMPLETED':
        return `Project Completed: ${data.projectName}`;
      case 'CONTACT_RESPONSE':
        return 'Response to your inquiry';
      case 'CONTACT_RECEIVED':
        return `We received your message – Ticket #${data.ticketId || ''}`;
      case 'CONTACT_INQUIRY':
        return `[Contact] ${data.subject || 'New inquiry'} – ${data.ticketId || ''}`;
      case 'NOTIFICATION':
        return data.title || 'Notification from Nestlancer';
      case 'ANNOUNCEMENT':
        return data.title || 'System Announcement';
      default:
        return 'Notification from Nestlancer';
    }
  }
}
