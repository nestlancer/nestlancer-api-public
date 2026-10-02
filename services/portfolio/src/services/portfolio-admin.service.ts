import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { PortfolioStatus } from '@nestlancer/common';
import { PortfolioItem, PortfolioVisibility, Prisma } from '@prisma/client';
import { BulkUpdatePortfolioDto, BulkOperation } from '../dto/bulk-update-portfolio.dto';
import { UpdatePrivacyDto, Visibility } from '../dto/update-privacy.dto';
import { UpdatePortfolioItemDto } from '../dto/update-portfolio-item.dto';
import { AdminQueryPortfolioDto } from '../dto/admin-query-portfolio.dto';
import { mapPortfolioWritePayload } from '../utils/portfolio-payload.util';

export interface PaginatedResult<T> {
  items: T[];
  totalItems: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class PortfolioAdminService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  async findAll(query: AdminQueryPortfolioDto): Promise<PaginatedResult<PortfolioItem>> {
    const { status, categoryId, featured, page = 1, limit = 20 } = query;
    const skip = (page - 1) * Number(limit);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (featured !== undefined) where.featured = featured;

    const [items, totalItems] = await Promise.all([
      this.prismaRead.portfolioItem.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { category: true },
      }),
      this.prismaRead.portfolioItem.count({ where }),
    ]);

    return {
      items,
      totalItems,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalItems / Number(limit)),
    };
  }

  async findById(id: string) {
    const item = await this.prismaRead.portfolioItem.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!item) throw new NotFoundException('Portfolio item not found');
    return item;
  }

  async update(id: string, dto: UpdatePortfolioItemDto) {
    // Verify item exists
    await this.findById(id);

    const updateData = mapPortfolioWritePayload(dto);

    return this.prismaWrite.portfolioItem.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });
  }

  async softDelete(id: string) {
    // Verify item exists
    await this.findById(id);

    return this.prismaWrite.portfolioItem.update({
      where: { id },
      data: { deletedAt: new Date(), status: PortfolioStatus.ARCHIVED },
    });
  }

  async hardDelete(id: string) {
    // Verify item exists
    await this.findById(id);

    return this.prismaWrite.portfolioItem.delete({
      where: { id },
    });
  }

  async publish(id: string) {
    // Verify item exists
    await this.findById(id);

    return this.prismaWrite.portfolioItem.update({
      where: { id },
      data: {
        status: PortfolioStatus.PUBLISHED,
        visibility: PortfolioVisibility.PUBLIC,
        publishedAt: new Date(),
      },
    });
  }

  async unpublish(id: string) {
    // Verify item exists
    await this.findById(id);

    return this.prismaWrite.portfolioItem.update({
      where: { id },
      data: {
        status: PortfolioStatus.DRAFT,
        visibility: PortfolioVisibility.PRIVATE,
        publishedAt: null,
      },
    });
  }

  async archive(id: string) {
    // Verify item exists
    await this.findById(id);

    return this.prismaWrite.portfolioItem.update({
      where: { id },
      data: { status: PortfolioStatus.ARCHIVED },
    });
  }

  async toggleFeatured(id: string) {
    const item = await this.findById(id);
    return this.prismaWrite.portfolioItem.update({
      where: { id },
      data: { featured: !item.featured },
    });
  }

  async updatePrivacy(id: string, dto: UpdatePrivacyDto) {
    // Verify item exists
    await this.findById(id);

    // Map DTO visibility to Prisma enum
    const visibilityMap = {
      [Visibility.PUBLIC]: PortfolioVisibility.PUBLIC,
      [Visibility.UNLISTED]: PortfolioVisibility.UNLISTED,
      [Visibility.PRIVATE]: PortfolioVisibility.PRIVATE,
    };

    return this.prismaWrite.portfolioItem.update({
      where: { id },
      data: { visibility: visibilityMap[dto.visibility] },
    });
  }

  async duplicate(id: string) {
    const item = await this.findById(id);

    return this.prismaWrite.portfolioItem.create({
      data: {
        title: `${item.title} (Copy)`,
        slug: `${item.slug}-copy-${Date.now()}`,
        shortDescription: item.shortDescription,
        fullDescription: item.fullDescription,
        contentFormat: item.contentFormat,
        categoryId: item.categoryId,
        status: PortfolioStatus.DRAFT,
        visibility: item.visibility,
        featured: item.featured,
        order: item.order,
        likeCount: 0,
        viewCount: 0,
        clientName: item.clientName,
        clientLogo: item.clientLogo,
        clientIndustry: item.clientIndustry,
        clientWebsite: item.clientWebsite,
        clientTestimonial: item.clientTestimonial as Prisma.InputJsonValue,
        stats: item.stats as Prisma.InputJsonValue,
        thumbnailId: item.thumbnailId,
        videoId: item.videoId,
        tags: item.tags as Prisma.InputJsonValue,
        projectDetails: item.projectDetails as Prisma.InputJsonValue,
        links: item.links as Prisma.InputJsonValue,
        seo: item.seo as Prisma.InputJsonValue,
        publishedAt: null,
        deletedAt: null,
        completedAt: item.completedAt,
      },
    });
  }

  async bulkUpdate(dto: BulkUpdatePortfolioDto) {
    const { operation, ids } = dto;

    switch (operation) {
      case BulkOperation.PUBLISH:
        return this.prismaWrite.portfolioItem.updateMany({
          where: { id: { in: ids } },
          data: { status: PortfolioStatus.PUBLISHED, publishedAt: new Date() },
        });

      case BulkOperation.ARCHIVE:
        return this.prismaWrite.portfolioItem.updateMany({
          where: { id: { in: ids } },
          data: { status: PortfolioStatus.ARCHIVED },
        });

      case BulkOperation.DELETE:
        return this.prismaWrite.portfolioItem.deleteMany({
          where: { id: { in: ids } },
        });

      case BulkOperation.FEATURE:
        return this.prismaWrite.portfolioItem.updateMany({
          where: { id: { in: ids } },
          data: { featured: true },
        });

      case BulkOperation.UNFEATURE:
        return this.prismaWrite.portfolioItem.updateMany({
          where: { id: { in: ids } },
          data: { featured: false },
        });

      default:
        throw new Error(`Unknown bulk operation: ${operation}`);
    }
  }
}
