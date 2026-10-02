import { Injectable, Logger } from '@nestjs/common';

import { ContactStatus } from '@prisma/client';

import { CacheService } from '@nestlancer/cache';
import {
  BusinessLogicException,
  RateLimitException,
  generateUuid,
  isRateLimitEnabled,
} from '@nestlancer/common';
import { PrismaWriteService } from '@nestlancer/database';
import { EmailJobType, publishEmailJobs } from '@nestlancer/email';
import { OutboxService } from '@nestlancer/outbox';
import { QueuePublisherService } from '@nestlancer/queue';
import { TurnstileService } from '@nestlancer/turnstile';

import { SpamFilterService } from './spam-filter.service';
import { contactConfig } from '../config/contact.config';
import { SubmitContactDto } from '../dto/submit-contact.dto';

@Injectable()
export class ContactSubmissionService {
  private readonly logger = new Logger(ContactSubmissionService.name);

  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly cacheService: CacheService,
    private readonly turnstileService: TurnstileService,
    private readonly spamFilterService: SpamFilterService,
    private readonly queuePublisher: QueuePublisherService,
    private readonly outbox: OutboxService,
  ) {}

  async submit(dto: SubmitContactDto, ip: string): Promise<{ ticketId: string }> {
    // 1. Rate Limit (honors RATE_LIMIT_ENABLED — same master switch as gateway/auth)
    if (isRateLimitEnabled()) {
      const rateLimitKey = `ratelimit:contact:${ip}`;
      const currentCount = await this.cacheService.incr(rateLimitKey);
      if (currentCount === 1) {
        await this.cacheService.expire(rateLimitKey, contactConfig.RATE_LIMIT_TTL_HOURS * 3600);
      }
      if (currentCount > contactConfig.RATE_LIMIT_PER_IP) {
        throw new RateLimitException(contactConfig.RATE_LIMIT_TTL_HOURS * 3600);
      }
    }

    // 2. Turnstile (skipped when TURNSTILE_SECRET_KEY is unset in Infisical)
    if (this.turnstileService.isEnabled()) {
      try {
        const turnstileResult = await this.turnstileService.verify(dto.turnstileToken, ip);
        if (!turnstileResult?.success) {
          throw new BusinessLogicException(
            'Security verification failed. Please try again.',
            'CONTACT_005',
          );
        }
      } catch (error: unknown) {
        if (error instanceof BusinessLogicException) throw error;
        const message = error instanceof Error ? error.message : 'unknown error';
        this.logger.warn(`Turnstile validation failed for IP ${ip}: ${message}`);
        throw new BusinessLogicException(
          'Security verification failed. Please try again.',
          'CONTACT_005',
        );
      }
    }

    // 3. Spam Check
    const spamCheck = this.spamFilterService.checkSpam(dto.email, dto.message);
    const resolvedStatus = spamCheck.isSpam ? ContactStatus.SPAM : ContactStatus.NEW;

    // 4. Generate unique ticketId (use full UUID segment to avoid collisions with seeded data)
    const ticketId = `TKT-${generateUuid().toUpperCase()}`;

    let referencePortfolioTitle: string | undefined;
    if (dto.referencePortfolioItemId) {
      const ref = await this.prismaWrite.portfolioItem.findFirst({
        where: {
          id: dto.referencePortfolioItemId,
          status: 'PUBLISHED',
          deletedAt: null,
        },
        select: { title: true },
      });
      if (ref) referencePortfolioTitle = ref.title;
    }

    // 5. Create Contact Message
    const message = await this.prismaWrite.contactMessage.create({
      data: {
        ticketId,
        name: dto.name,
        email: dto.email,
        subject: dto.subject as any,
        message: dto.message,
        status: resolvedStatus as any,
        referencePortfolioItemId: referencePortfolioTitle
          ? dto.referencePortfolioItemId
          : undefined,
        referencePortfolioTitle,
        ipInfo: { ip },
      },
    });

    // 6. Notify admin (in-app via outbox) + email team inbox + visitor auto-ack
    if (!spamCheck.isSpam) {
      await this.outbox.createEvent({
        aggregateType: 'ContactMessage',
        aggregateId: message.id,
        type: 'CONTACT_INQUIRY_RECEIVED',
        payload: {
          contactId: message.id,
          ticketId,
          subject: dto.subject,
          name: dto.name,
          email: dto.email,
          referencePortfolioItemId: message.referencePortfolioItemId,
          referencePortfolioTitle: message.referencePortfolioTitle,
        },
      });

      await publishEmailJobs(this.queuePublisher, [
        {
          type: EmailJobType.CONTACT_INQUIRY,
          to: process.env.CONTACT_INBOX_EMAIL || 'contact@nestlancer.com',
          senderProfile: 'default',
          replyTo: dto.email,
          data: {
            name: dto.name,
            email: dto.email,
            subject: dto.subject,
            message: dto.message,
            ticketId,
            contactId: message.id,
          },
        },
        {
          type: EmailJobType.CONTACT_RECEIVED,
          to: dto.email,
          senderProfile: 'default',
          data: {
            name: dto.name,
            ticketId,
            subject: dto.subject,
          },
        },
      ]);
    }

    return { ticketId };
  }
}
