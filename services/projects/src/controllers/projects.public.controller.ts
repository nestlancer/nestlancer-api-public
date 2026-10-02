import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiStandardResponse,
  ApiStandardResponses,
  BusinessLogicException,
  Public,
} from '@nestlancer/common';
import { PrismaReadService } from '@nestlancer/database';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';

/**
 * Controller for public-facing project/portfolio discovery.
 * Exposes published portfolio items (public projects) for discovery.
 */
@ApiTags('Public/Projects')
@Controller('public')
@ApiStandardResponses()
export class ProjectsPublicController {
  constructor(private readonly prismaRead: PrismaReadService) {}

  /**
   * Lists publicly available portfolio projects for discovery.
   * Query: page, limit (default 20).
   */
  @Public()
  @Get()
  @ApiOperation({ summary: 'List public projects' })
  @ApiStandardResponse()
  async listPublicProjects(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<any> {
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20', 10)));
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      this.prismaRead.portfolioItem.findMany({
        where: { status: 'PUBLISHED', visibility: 'PUBLIC', deletedAt: null },
        skip,
        take: limitNum,
        orderBy: [{ order: 'asc' }, { publishedAt: 'desc' }],
        select: {
          id: true,
          slug: true,
          title: true,
          shortDescription: true,
          thumbnailId: true,
          publishedAt: true,
          likeCount: true,
          viewCount: true,
          category: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prismaRead.portfolioItem.count({
        where: { status: 'PUBLISHED', visibility: 'PUBLIC', deletedAt: null },
      }),
    ]);

    return items;
  }

  /**
   * Retrieves detailed information for a specific public project (portfolio item).
   * Id can be UUID or slug.
   */
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get public project details' })
  @ApiParam({ name: 'id', description: 'Portfolio item UUID or slug' })
  @ApiStandardResponse()
  async getPublicProjectDetails(@Param('id') id: string): Promise<any> {
    const isSlug = !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const item = await this.prismaRead.portfolioItem.findFirst({
      where: {
        deletedAt: null,
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
        ...(isSlug ? { slug: id } : { id }),
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: {
          orderBy: { order: 'asc' },
          take: 20,
          select: { mediaId: true, alt: true, caption: true, order: true },
        },
      },
    });
    if (!item) throw new BusinessLogicException('Project not public or not found', 'PROJECT_001');
    return { data: item };
  }
}
