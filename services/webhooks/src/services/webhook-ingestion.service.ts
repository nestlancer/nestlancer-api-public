import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaWriteService } from '@nestlancer/database';
import { WebhookDispatcherService } from './webhook-dispatcher.service';
import { RazorpayProvider } from '../providers/razorpay.provider';
import { CloudflareProvider } from '../providers/cloudflare.provider';
import { WebhookProvider } from '../interfaces/webhook-provider.interface';
import { WebhookEvent } from '../interfaces/webhook-event.interface';

// Using the enum values from the schema
const WebhookLogStatus = {
  PENDING: 'PENDING',
  PROCESSED: 'PROCESSED',
  FAILED: 'FAILED',
} as const;

interface StoredWebhookLog {
  id: string;
  provider: string;
  eventId?: string | null;
  eventType: string;
  payload: unknown;
  headers?: Record<string, string> | null;
  status: string;
  error?: string | null;
  processedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class WebhookIngestionService {
  private readonly logger = new Logger(WebhookIngestionService.name);
  private providers: Map<string, WebhookProvider> = new Map();

  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly dispatcherService: WebhookDispatcherService,
    private readonly razorpayProvider: RazorpayProvider,
    private readonly cloudflareProvider: CloudflareProvider,
  ) {
    this.providers.set(this.razorpayProvider.name, this.razorpayProvider);
    this.providers.set(this.cloudflareProvider.name, this.cloudflareProvider);
  }

  async handleIncoming(
    providerId: string,
    rawBody: Buffer,
    headers: Record<string, string>,
  ): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new BadRequestException(`Provider ${providerId} not supported`);
    }

    if (!provider.verifySignature(rawBody, headers)) {
      this.logger.warn(`Signature verification failed for ${providerId}`);
      throw new UnauthorizedException({
        code: 'WEBHOOK_001',
        message: 'Invalid webhook signature',
      });
    }

    let payloadUrlDecoded: Record<string, unknown>;
    try {
      payloadUrlDecoded = JSON.parse(rawBody.toString('utf8'));
    } catch (e: any) {
      throw new UnprocessableEntityException({
        code: 'WEBHOOK_003',
        message: 'Unprocessable webhook payload',
      });
    }

    const event = provider.parseEvent(payloadUrlDecoded, headers);

    const webhookLog = await this.prismaWrite.webhookLog.create({
      data: {
        provider: providerId,
        eventId: event.eventId,
        eventType: event.eventType,
        payload: payloadUrlDecoded as unknown as import('@prisma/client').Prisma.InputJsonValue,
        headers: headers as unknown as import('@prisma/client').Prisma.InputJsonValue,
        status: WebhookLogStatus.PENDING,
      },
    });

    try {
      await this.dispatcherService.dispatch(event, webhookLog.id);

      await this.prismaWrite.webhookLog.update({
        where: { id: webhookLog.id },
        data: {
          status: WebhookLogStatus.PROCESSED,
          processedAt: new Date(),
        },
      });
    } catch (err: any) {
      this.logger.error(`Error processing webhook ${webhookLog.id}`, err);
      await this.prismaWrite.webhookLog.update({
        where: { id: webhookLog.id },
        data: {
          status: WebhookLogStatus.FAILED,
          error: err instanceof Error ? err.message : 'Unknown error',
        },
      });
      throw err;
    }
  }

  async processStoredWebhook(webhookLog: StoredWebhookLog): Promise<void> {
    const provider = this.providers.get(webhookLog.provider);
    if (!provider) {
      throw new BadRequestException(`Provider ${webhookLog.provider} not supported`);
    }

    let event: WebhookEvent;
    try {
      const payloadData =
        typeof webhookLog.payload === 'string'
          ? JSON.parse(webhookLog.payload)
          : webhookLog.payload;
      const headersData = webhookLog.headers || {};
      event = provider.parseEvent(payloadData as Record<string, unknown>, headersData);
    } catch (e: any) {
      this.logger.error('Failed to parse event from payload', e);
      throw e;
    }

    try {
      await this.dispatcherService.dispatch(event, webhookLog.id);

      await this.prismaWrite.webhookLog.update({
        where: { id: webhookLog.id },
        data: {
          status: WebhookLogStatus.PROCESSED,
          processedAt: new Date(),
          error: null,
        },
      });
    } catch (err: any) {
      this.logger.error(`Error processing stored webhook ${webhookLog.id}`, err);
      await this.prismaWrite.webhookLog.update({
        where: { id: webhookLog.id },
        data: {
          status: WebhookLogStatus.FAILED,
          error: err instanceof Error ? err.message : 'Unknown error',
        },
      });
      throw err;
    }
  }

  async retryFailedWebhooks(limit: number = 10): Promise<number> {
    const failedWebhooks = await this.prismaWrite.webhookLog.findMany({
      where: { status: WebhookLogStatus.FAILED },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    let processedCount = 0;
    for (const webhook of failedWebhooks) {
      try {
        await this.processStoredWebhook(webhook as StoredWebhookLog);
        processedCount++;
      } catch (err: any) {
        this.logger.error(`Retry failed for webhook ${webhook.id}`, err);
      }
    }

    return processedCount;
  }
}
