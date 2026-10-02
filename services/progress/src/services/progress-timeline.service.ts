import { Injectable } from '@nestjs/common';
import { clientVisibleProgressFilter } from '@nestlancer/common';
import { PrismaReadService } from '@nestlancer/database';
import { QueryProgressDto } from '../dto/query-progress.dto';
import { TimelineEntry } from '../interfaces/progress.interface';

@Injectable()
export class ProgressTimelineService {
  constructor(private readonly prismaRead: PrismaReadService) {}

  async getTimeline(projectId: string, query: QueryProgressDto) {
    const page = query.page ?? 1;
    const limit = query.pageSize ?? query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = {
      projectId,
      ...clientVisibleProgressFilter(),
      ...(query.type ? { type: query.type } : {}),
    };

    const entries = await this.prismaRead.progressEntry.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        milestone: {
          select: { id: true, name: true },
        },
      },
    });

    const total = await this.prismaRead.progressEntry.count({ where });

    const timeline: TimelineEntry[] = entries.map((entry) => ({
      id: entry.id,
      type: 'PROGRESS',
      title: entry.title,
      description: entry.description || '',
      date: entry.createdAt,
      metadata: {
        entryType: entry.type,
        milestone: entry.milestone,
      },
    }));

    return {
      items: timeline,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
