import { Injectable } from '@nestjs/common';

import { LoggerService } from '@nestlancer/logger';

import { WebhookHandler } from '../../interfaces/webhook-handler.interface';

@Injectable()
export class GithubDeploymentHandler implements WebhookHandler {
  constructor(private readonly logger: LoggerService) {}

  canHandle(provider: string, eventType: string): boolean {
    return provider === 'github' && eventType === 'deployment';
  }

  async handle(payload: any): Promise<void> {
    this.logger.log(`Received GitHub deployment event: ${payload.deployment.environment}`);
  }
}
