import { Injectable } from '@nestjs/common';

import { LoggerService } from '@nestlancer/logger';

import { WebhookHandler } from '../../interfaces/webhook-handler.interface';

@Injectable()
export class GithubPullRequestHandler implements WebhookHandler {
  constructor(private readonly logger: LoggerService) {}

  canHandle(provider: string, eventType: string): boolean {
    return provider === 'github' && eventType === 'pull_request';
  }

  async handle(payload: any): Promise<void> {
    this.logger.log(`Received GitHub PR event: ${payload.action} on ${payload.pull_request.title}`);
  }
}
