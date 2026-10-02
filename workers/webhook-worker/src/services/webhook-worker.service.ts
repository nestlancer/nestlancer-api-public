import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { ResourceNotFoundException } from '@nestlancer/common';

import { GithubDeploymentHandler } from '../handlers/github/deployment.handler';
import { GithubPullRequestHandler } from '../handlers/github/pull-request.handler';
import { GithubPushHandler } from '../handlers/github/push.handler';
import { DisputeCreatedHandler } from '../handlers/razorpay/dispute-created.handler';
import { PaymentCapturedHandler } from '../handlers/razorpay/payment-captured.handler';
import { PaymentFailedHandler } from '../handlers/razorpay/payment-failed.handler';
import { RefundProcessedHandler } from '../handlers/razorpay/refund-processed.handler';
import { WebhookHandler } from '../interfaces/webhook-handler.interface';

/**
 * Orchestrator service for the Webhook Worker.
 * Dynamically resolves and dispatches incoming webhooks to specific domain handlers.
 * Supports multiple providers (e.g. Razorpay, GitHub) and their various event types.
 */
@Injectable()
export class WebhookWorkerService implements OnModuleInit {
  private handlers: WebhookHandler[] = [];

  constructor(private readonly moduleRef: ModuleRef) {}

  /**
   * Initializes the service by collecting all registered webhook handlers.
   */
  onModuleInit(): void {
    this.handlers = [
      this.moduleRef.get(PaymentCapturedHandler),
      this.moduleRef.get(PaymentFailedHandler),
      this.moduleRef.get(RefundProcessedHandler),
      this.moduleRef.get(DisputeCreatedHandler),
      this.moduleRef.get(GithubPushHandler),
      this.moduleRef.get(GithubPullRequestHandler),
      this.moduleRef.get(GithubDeploymentHandler),
    ];
  }

  /**
   * Dispatches an incoming webhook to the matching handler.
   *
   * @param provider - The source of the webhook (e.g. 'razorpay', 'github')
   * @param eventType - The specific event name from the provider
   * @param payload - The raw data payload from the provider
   * @returns A promise that resolves when the handler completes its logic
   * @throws ResourceNotFoundException if no handler is registered for the provider:eventType pair
   */
  async dispatch(provider: string, eventType: string, payload: any): Promise<void> {
    const handler = this.handlers.find((h) => h.canHandle(provider, eventType));
    if (handler) {
      await handler.handle(payload);
    } else {
      throw new ResourceNotFoundException('WebhookHandler', `${provider}:${eventType}`);
    }
  }
}
