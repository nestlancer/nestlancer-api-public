import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { lastValueFrom } from 'rxjs';

import { generateUuid, assertSafeWebhookUrl } from '@nestlancer/common';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';
import { LoggerService } from '@nestlancer/logger';
import { Processor, Process } from '@nestlancer/queue';

import { OutgoingWebhookJob } from '../interfaces/webhook-job.interface';
import { SignatureVerifierService } from '../services/signature-verifier.service';
import { WebhookLoggerService } from '../services/webhook-logger.service';

@Processor('webhook')
@Injectable()
export class OutgoingWebhookProcessor {
  constructor(
    private readonly logger: LoggerService,
    private readonly http: HttpService,
    private readonly configService: ConfigService,
    private readonly signatureVerifier: SignatureVerifierService,
    private readonly webhookLogger: WebhookLoggerService,
    private readonly prisma: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
  ) {}

  @Process()
  async handleOutgoing(job: OutgoingWebhookJob): Promise<void> {
    const webhook = await this.prisma.webhook.findUnique({ where: { id: job.webhookId } });
    if (!webhook || !webhook.enabled) return;

    // NL-BUG-HOOK-001: re-validate at delivery time (DNS rebinding / stale private URLs).
    try {
      await assertSafeWebhookUrl(webhook.url);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Webhook URL is not allowed';
      this.logger.warn(`[WebhookWorker] Blocked delivery to unsafe URL: ${message}`);
      await this.webhookLogger.logDelivery(webhook.id, job.event, job.payload, {
        statusCode: 400,
        responseBody: message,
        responseTime: 0,
        attempt: job.attempt,
      });
      return;
    }

    const timeoutMs = this.configService.get<number>('webhook-worker.outgoingTimeoutMs', 10000);

    const signature = this.signatureVerifier.sign(job.payload, webhook.secret);
    const startTime = Date.now();

    try {
      const response = await lastValueFrom(
        this.http.post(webhook.url, job.payload, {
          headers: {
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': job.event,
            'X-Webhook-Delivery-ID': generateUuid(),
            'Content-Type': 'application/json',
          },
          timeout: timeoutMs,
        }),
      );

      await this.webhookLogger.logDelivery(webhook.id, job.event, job.payload, {
        statusCode: response.status,
        responseBody: JSON.stringify(response.data),
        responseTime: Date.now() - startTime,
        attempt: job.attempt,
      });
    } catch (error: any) {
      await this.webhookLogger.logDelivery(webhook.id, job.event, job.payload, {
        statusCode: error.response?.status || 500,
        responseBody: JSON.stringify(error.response?.data || error.message),
        responseTime: Date.now() - startTime,
        attempt: job.attempt,
      });

      const maxRetries = this.configService.get<number>('webhook-worker.maxRetries') ?? 5;
      if (job.attempt >= maxRetries) {
        await this.prismaWrite.outbox
          .create({
            data: {
              type: 'WEBHOOK_DELIVERY_FAILED',
              payload: {
                webhookId: job.webhookId,
                event: job.event,
                attempt: job.attempt,
              },
            },
          })
          .catch(() => undefined);
      }

      throw error; // Let queue handle retries
    }
  }
}
