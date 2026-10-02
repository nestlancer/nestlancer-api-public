import { Injectable } from '@nestjs/common';

import { LoggerService } from '@nestlancer/logger';
import { Processor, Process } from '@nestlancer/queue';

import { IncomingWebhookJob } from '../interfaces/webhook-job.interface';
import { WebhookWorkerService } from '../services/webhook-worker.service';

@Processor('github.webhook') // Example additional queue
@Injectable()
export class GithubWebhookProcessor {
  constructor(
    private readonly logger: LoggerService,
    private readonly webhookService: WebhookWorkerService,
  ) {}

  @Process()
  async handleGithub(job: IncomingWebhookJob): Promise<void> {
    this.logger.log(`Processing GitHub event: ${job.eventType}`);
    await this.webhookService.dispatch('github', job.eventType, job.payload);
  }
}
