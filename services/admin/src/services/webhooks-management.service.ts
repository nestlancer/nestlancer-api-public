import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { assertSafeWebhookUrl } from '@nestlancer/common';
import { CreateWebhookDto } from '../dto/create-webhook.dto';
import { UpdateWebhookDto } from '../dto/update-webhook.dto';
import * as crypto from 'crypto';

interface RetryPolicy {
  maxRetries: number;
  retryDelayMs: number;
  backoffMultiplier: number;
}

interface WebhookResponse {
  id: string;
  name: string;
  url: string;
  secret: string;
  enabled: boolean;
  events: string[];
  headers: Record<string, string> | null;
  retryPolicy: RetryPolicy | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class WebhooksManagementService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  async create(dto: CreateWebhookDto): Promise<WebhookResponse> {
    await this.assertWebhookUrl(dto.url);
    const secret = dto.secret || crypto.randomBytes(32).toString('hex');

    const webhook = await this.prismaWrite.webhook.create({
      data: {
        name: dto.name,
        url: dto.url,
        events: dto.events,
        headers: dto.headers || {},
        secret,
        enabled: dto.enabled ?? true,
        retryPolicy: (dto.retryPolicy || {
          maxRetries: 3,
          retryDelayMs: 1000,
          backoffMultiplier: 2,
        }) as any,
      },
    });

    return this.formatWebhookResponse(webhook);
  }

  async findAll(): Promise<WebhookResponse[]> {
    const webhooks = await this.prismaRead.webhook.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return webhooks.map((w) => this.formatWebhookResponse(w));
  }

  async findOne(id: string): Promise<WebhookResponse> {
    const webhook = await this.prismaRead.webhook.findUnique({ where: { id } });
    if (!webhook) throw new NotFoundException('Webhook not found');
    return this.formatWebhookResponse(webhook);
  }

  async update(id: string, dto: UpdateWebhookDto): Promise<WebhookResponse> {
    await this.findOne(id);
    if (dto.url !== undefined) await this.assertWebhookUrl(dto.url);

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.url !== undefined) updateData.url = dto.url;
    if (dto.events !== undefined) updateData.events = dto.events;
    if (dto.headers !== undefined) updateData.headers = dto.headers;
    if (dto.secret !== undefined) updateData.secret = dto.secret;
    if (dto.enabled !== undefined) updateData.enabled = dto.enabled;
    if (dto.retryPolicy !== undefined) updateData.retryPolicy = dto.retryPolicy;

    const webhook = await this.prismaWrite.webhook.update({
      where: { id },
      data: updateData,
    });

    return this.formatWebhookResponse(webhook);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prismaWrite.webhook.delete({ where: { id } });
  }

  async regenerateSecret(id: string): Promise<{ secret: string }> {
    await this.findOne(id);
    const newSecret = crypto.randomBytes(32).toString('hex');

    await this.prismaWrite.webhook.update({
      where: { id },
      data: { secret: newSecret },
    });

    return { secret: newSecret };
  }

  async toggleEnabled(id: string): Promise<WebhookResponse> {
    const existing = await this.findOne(id);

    const webhook = await this.prismaWrite.webhook.update({
      where: { id },
      data: { enabled: !existing.enabled },
    });

    return this.formatWebhookResponse(webhook);
  }

  async testWebhook(
    id: string,
  ): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    const webhook = await this.findOne(id);
    try {
      await this.assertWebhookUrl(webhook.url);
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook URL is not allowed',
      };
    }

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Test': 'true',
          ...(webhook.headers || {}),
        },
        body: JSON.stringify({
          event: 'webhook.test',
          timestamp: new Date().toISOString(),
          data: { message: 'This is a test webhook delivery' },
        }),
      });

      return {
        success: response.ok,
        statusCode: response.status,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async assertWebhookUrl(url: string): Promise<void> {
    try {
      await assertSafeWebhookUrl(url);
    } catch (error: unknown) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Webhook URL is not allowed',
      );
    }
  }

  private formatWebhookResponse(webhook: any): WebhookResponse {
    return {
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      secret: webhook.secret,
      enabled: webhook.enabled,
      events: webhook.events as string[],
      headers: webhook.headers as Record<string, string> | null,
      retryPolicy: webhook.retryPolicy as RetryPolicy | null,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt,
    };
  }
}
