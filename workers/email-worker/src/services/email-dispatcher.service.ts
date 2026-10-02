import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { mapToEmailJobs } from '@nestlancer/email';

import { EmailRecipientResolverService } from './email-recipient-resolver.service';
import { EmailWorkerService } from './email-worker.service';
import { EmailJob } from '../interfaces/email-job.interface';

/**
 * Normalizes queue messages (EmailJob, outbox payloads, legacy shapes) and dispatches sends.
 */
@Injectable()
export class EmailDispatcherService {
  private readonly logger = new Logger(EmailDispatcherService.name);

  constructor(
    private readonly emailWorker: EmailWorkerService,
    private readonly recipientResolver: EmailRecipientResolverService,
    private readonly configService: ConfigService,
  ) {}

  async dispatch(routingKey: string | undefined, raw: unknown): Promise<void> {
    const payload = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};

    const enriched = await this.recipientResolver.enrich(payload);
    const jobs = mapToEmailJobs(routingKey, enriched, {
      frontendUrl: this.configService.get<string>('emailWorker.frontendUrl'),
      contactInboxEmail: this.configService.get<string>('emailWorker.contactInboxEmail'),
    });

    if (jobs.length === 0) {
      this.logger.warn(
        `[EmailDispatcher] No mappable email jobs for routingKey=${routingKey ?? 'n/a'}`,
      );
      return;
    }

    for (const job of jobs) {
      await this.emailWorker.processEmail(job as EmailJob);
    }
  }
}
