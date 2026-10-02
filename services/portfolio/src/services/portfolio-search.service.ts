import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaReadService, ReadOnly } from '@nestlancer/database';
import { SearchPortfolioDto } from '../dto/search-portfolio.dto';
import { PortfolioStatus } from '@nestlancer/common';

function sanitizeSearchQuery(raw: string | undefined): string {
  if (typeof raw !== 'string' || /[\u0000-\u001F\u007F]/.test(raw)) {
    throw new BadRequestException('q must not contain control characters');
  }
  const q = raw.trim();
  if (q.length < 2) {
    throw new BadRequestException('q must be longer than or equal to 2 characters');
  }
  return q;
}

@Injectable()
export class PortfolioSearchService {
  constructor(private readonly prismaRead: PrismaReadService) {}

  @ReadOnly()
  async search(dto: SearchPortfolioDto) {
    const q = sanitizeSearchQuery(dto.q);
    const { categoryId } = dto;

    const where: Prisma.PortfolioItemWhereInput = {
      status: PortfolioStatus.PUBLISHED,
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { shortDescription: { contains: q, mode: 'insensitive' } },
      ],
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const items = await this.prismaRead.portfolioItem.findMany({
      where,
      orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }],
      take: 50,
      include: {
        category: true,
      },
    });

    return items;
  }
}
