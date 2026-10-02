import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import * as webpush from 'web-push';

import { PushPayload } from '../interfaces/push-payload.interface';

/**
 * Provider service for Web Push notifications.
 * Wraps the web-push library and manages VAPID cryptographic details.
 */
@Injectable()
export class PushProviderService implements OnModuleInit {
  private readonly logger = new Logger(PushProviderService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Initializes the service by setting up VAPID credentials for Web Push.
   */
  onModuleInit(): void {
    const publicKey = this.configService.get<string>('notificationWorker.vapid.publicKey');
    const privateKey = this.configService.get<string>('notificationWorker.vapid.privateKey');
    const subject = this.configService.get<string>('notificationWorker.vapid.subject');

    if (publicKey && privateKey && subject) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.logger.log(
        '[PushProvider] Successfully configured VAPID details for Web Push delivery.',
      );
    } else {
      this.logger.warn(
        '[PushProvider] VAPID details missing from configuration. Web Push delivery will be disabled.',
      );
    }
  }

  /**
   * Sends a push notification to a specific browser/device subscription.
   *
   * @param subscription - The JSON subscription object from the client browser
   * @param payload - The data payload to send to the device
   * @returns A promise resolving to true if delivered, or false if the subscription is no longer valid
   * @throws Error if any other unexpected delivery error occurs
   */
  async sendNotification(subscription: any, payload: PushPayload): Promise<boolean> {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      return true;
    } catch (error: any) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        this.logger.warn(
          `[PushProvider] Delivered failed: Subscription expired or invalid (HTTP ${error.statusCode})`,
        );
        return false;
      }
      this.logger.error(
        `[PushProvider] Internal error during delivery: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
