import { Injectable } from '@nestjs/common';
import { PrismaReadService } from '@nestlancer/database';

@Injectable()
export class MessageThreadsService {
  constructor(private readonly prismaRead: PrismaReadService) {}

  async getThreadReplies(messageId: string, query: { page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prismaRead.message.findMany({
        where: { replyToId: messageId, deletedAt: null },
        orderBy: { createdAt: 'asc' }, // Replies usually shown chronologically
        skip,
        take: limit,
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        },
      }),
      this.prismaRead.message.count({
        where: { replyToId: messageId, deletedAt: null },
      }),
    ]);

    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
