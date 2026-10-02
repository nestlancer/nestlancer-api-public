import { Injectable } from '@nestjs/common';
import { PrismaReadService } from '@nestlancer/database';
import { QueryWebhookDeliveriesDto } from '../dto/query-webhook-deliveries.dto';

@Injectable()
export class WebhookDeliveriesService {
  constructor(private readonly prismaRead: PrismaReadService) {}

  async findAll(webhookId: string, query: QueryWebhookDeliveriesDto) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: any = { webhookId };
    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prismaRead.webhookDelivery.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaRead.webhookDelivery.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async getDeliveryStats(webhookId: string) {
    const stats = await this.prismaRead.webhookDelivery.groupBy({
      by: ['status'],
      where: { webhookId },
      _count: true,
    });

    return stats.reduce(
      (acc, curr) => {
        acc[curr.status] = curr._count;
        return acc;
      },
      {} as Record<string, number>,
    );
  }
}
