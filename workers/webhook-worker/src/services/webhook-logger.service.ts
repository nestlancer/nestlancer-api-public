import { Injectable } from '@nestjs/common';

import { PrismaWriteService } from '@nestlancer/database';

@Injectable()
export class WebhookLoggerService {
  constructor(private readonly prisma: PrismaWriteService) {}

  async logDelivery(webhookId: string, event: string, payload: any, result: any): Promise<void> {
    await this.prisma.webhookDelivery.create({
      data: {
        webhookId,
        event,
        payload,
        statusCode: result.statusCode,
        responseBody: result.responseBody,
        responseTime: result.responseTime,
        attempts: result.attempt,
        status: result.statusCode >= 200 && result.statusCode < 300 ? 'SUCCESS' : 'FAILED',
      },
    });
  }
}
