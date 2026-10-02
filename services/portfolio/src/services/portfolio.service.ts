import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService, ReadOnly } from '@nestlancer/database';
import { Prisma } from '@prisma/client';
import { CreatePortfolioItemDto } from '../dto/create-portfolio-item.dto';
import { QueryPortfolioDto } from '../dto/query-portfolio.dto';
import { PortfolioStatus } from '@nestlancer/common';
import { mapPortfolioWritePayload } from '../utils/portfolio-payload.util';

@Injectable()
export class PortfolioService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  async create(dto: CreatePortfolioItemDto) {
    const slug =
      dto.slug ||
      dto.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

    const { imageIds } = dto;
    const mapped = mapPortfolioWritePayload(dto);

    return this.prismaWrite.portfolioItem.create({
      data: {
        ...(mapped as Prisma.PortfolioItemUncheckedCreateInput),
        title: dto.title,
        shortDescription: dto.shortDescription,
        fullDescription: dto.fullDescription,
        contentFormat: String(dto.contentFormat).toLowerCase(),
        slug: (mapped.slug as string) || slug,
        categoryId: (mapped.categoryId as string) || (dto.categoryId as string),
        status: PortfolioStatus.DRAFT,
        order: 0,
        likeCount: 0,
        viewCount: 0,
        images: imageIds
          ? {
              create: imageIds.map((mediaId, index) => ({ mediaId, order: index })),
            }
          : undefined,
      },
      include: { category: true, images: true },
    });
  }

  @ReadOnly()
  async findPublished(query: QueryPortfolioDto) {
    const { page = 1, limit = 20, categoryId, featured } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PortfolioItemWhereInput = {
      status: PortfolioStatus.PUBLISHED,
      deletedAt: null,
      visibility: 'PUBLIC',
    };

    if (categoryId) where.categoryId = categoryId;
    if (featured !== undefined) where.featured = featured;

    const [items, totalItems] = await Promise.all([
      this.prismaRead.portfolioItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ featured: 'desc' }, { order: 'asc' }, { createdAt: 'desc' }],
        include: { category: true },
      }),
      this.prismaRead.portfolioItem.count({ where }),
    ]);

    return {
      items,
      totalItems,
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit),
      hasNextPage: skip + limit < totalItems,
      hasPreviousPage: page > 1,
    };
  }

  @ReadOnly()
  async findByIdOrSlug(idOrSlug: string, options?: { publicOnly?: boolean }) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const where: Prisma.PortfolioItemWhereInput = isUuid ? { id: idOrSlug } : { slug: idOrSlug };
    if (options?.publicOnly) {
      where.status = PortfolioStatus.PUBLISHED;
      where.deletedAt = null;
      where.visibility = { in: ['PUBLIC', 'UNLISTED'] };
    }

    const item = await this.prismaRead.portfolioItem.findFirst({
      where,
      include: {
        category: true,
        images: { orderBy: { order: 'asc' } },
      },
    });

    if (!item) {
      throw new NotFoundException(`Portfolio item not found`);
    }

    return item;
  }

  @ReadOnly()
  async getFeatured(limit = 8) {
    const baseWhere: Prisma.PortfolioItemWhereInput = {
      status: PortfolioStatus.PUBLISHED,
      deletedAt: null,
      visibility: 'PUBLIC',
    };
    const include = {
      category: true,
      images: { orderBy: { order: 'asc' as const } },
    };

    const featured = await this.prismaRead.portfolioItem.findMany({
      where: { ...baseWhere, featured: true },
      take: limit,
      orderBy: [{ order: 'asc' }, { publishedAt: 'desc' }],
      include,
    });

    if (featured.length >= limit) return featured;

    const filler = await this.prismaRead.portfolioItem.findMany({
      where: {
        ...baseWhere,
        featured: false,
        ...(featured.length > 0 ? { id: { notIn: featured.map((item) => item.id) } } : {}),
      },
      take: limit - featured.length,
      orderBy: [{ publishedAt: 'desc' }, { completedAt: 'desc' }, { createdAt: 'desc' }],
      include,
    });

    return [...featured, ...filler];
  }

  /** Chronological project list for public timeline UI (title + dates only). */
  @ReadOnly()
  async findPublishedTimeline(limit = 100) {
    const items = await this.prismaRead.portfolioItem.findMany({
      where: { status: PortfolioStatus.PUBLISHED, deletedAt: null, visibility: 'PUBLIC' },
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
        completedAt: true,
        createdAt: true,
      },
      orderBy: [{ publishedAt: 'desc' }, { completedAt: 'desc' }, { createdAt: 'desc' }],
    });
    return { items };
  }
}
