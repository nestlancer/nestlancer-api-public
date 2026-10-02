import { Controller, Get, Param, Query, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiStandardResponse, ApiStandardResponses, Public } from '@nestlancer/common';
import { OptionalJwtAuthGuard, AuthenticatedUser } from '@nestlancer/auth-lib';
import { Cacheable } from '@nestlancer/cache';
import { PortfolioService } from '../../services/portfolio.service';
import { PortfolioCategoriesService } from '../../services/portfolio-categories.service';
import { PortfolioSearchService } from '../../services/portfolio-search.service';
import { PortfolioAnalyticsService } from '../../services/portfolio-analytics.service';
import { PortfolioLikesService } from '../../services/portfolio-likes.service';
import { PortfolioPublicMapperService } from '../../services/portfolio-public-mapper.service';
import { QueryPortfolioDto } from '../../dto/query-portfolio.dto';
import { SearchPortfolioDto } from '../../dto/search-portfolio.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { PortfolioItemResponseDto } from '../../dto/portfolio-item-response.dto';
import { PortfolioTimelineItemDto } from '../../dto/portfolio-timeline-item.dto';
import { CategoryResponseDto } from '../../dto/category-response.dto';

/**
 * Controller for public-facing portfolio operations.
 */
@ApiTags('Public/Portfolio')
@Controller('portfolio')
@ApiStandardResponses()
export class PortfolioPublicController {
  constructor(
    private readonly portfolioService: PortfolioService,
    private readonly categoriesService: PortfolioCategoriesService,
    private readonly searchService: PortfolioSearchService,
    private readonly analyticsService: PortfolioAnalyticsService,
    private readonly likesService: PortfolioLikesService,
    private readonly publicMapper: PortfolioPublicMapperService,
  ) {}

  /**
   * Retrieves a paginated list of published portfolio items.
   * Supports complex filtering through the QueryPortfolioDto.
   *
   * @param query Filtering and pagination parameters
   * @returns A promise resolving to a paginated collection of portfolio items
   */
  @Public()
  @Get()
  @Cacheable({ ttl: Number(process.env.PUBLIC_CACHE_TTL ?? 3600) })
  @ApiOperation({
    summary: 'List published portfolio items',
    description: 'Fetch all portfolio entries that are marked as published.',
  })
  @ApiStandardResponse({ type: PortfolioItemResponseDto, isArray: true })
  async list(@Query() query: QueryPortfolioDto) {
    const result = await this.portfolioService.findPublished(query);
    const items = await this.publicMapper.toPublicItems(result.items as any[]);
    return { ...result, items };
  }

  /**
   * Retrieves a curated collection of featured portfolio items.
   * These items are specifically marked for high-visibility showcase.
   *
   * @returns A promise resolving to an array of featured portfolio items
   */
  @Public()
  @Get('featured')
  @Cacheable({ ttl: Number(process.env.FEATURED_CACHE_TTL ?? 7200) })
  @ApiOperation({
    summary: 'Get featured portfolio items',
    description: 'Retrieve high-priority portfolio entries intended for the main showcase.',
  })
  @ApiStandardResponse({ type: PortfolioItemResponseDto, isArray: true })
  async getFeatured() {
    const items = await this.portfolioService.getFeatured();
    return this.publicMapper.toPublicItems(items as any[]);
  }

  /**
   * Retrieves all active categories used for portfolio organization.
   *
   * @returns A promise resolving to an array of portfolio categories
   */
  @Public()
  @Get('categories')
  @Cacheable({ ttl: Number(process.env.PUBLIC_CACHE_TTL ?? 3600) })
  @ApiOperation({
    summary: 'Get all categories',
    description: 'Fetch a complete list of active categories used to classify portfolio projects.',
  })
  @ApiStandardResponse({ type: CategoryResponseDto, isArray: true })
  async getCategories() {
    return this.categoriesService.findAll();
  }

  /**
   * Aggregates and retrieves all unique tags across published portfolio entries.
   *
   * @returns A promise resolving to an array of unique tag strings
   */
  @Public()
  @Get('tags')
  @Cacheable({ ttl: Number(process.env.PUBLIC_CACHE_TTL ?? 3600) })
  @ApiOperation({
    summary: 'Get all unique tags',
    description:
      'Extract a unique set of all technological and thematic tags used in published items.',
  })
  @ApiResponse({ status: 200, description: 'List of tags', type: [String] })
  async getTags(): Promise<string[]> {
    const items = await this.portfolioService.findPublished({ page: 1, limit: 1000 });
    const tagsSet = new Set<string>();
    for (const item of items.items) {
      if (item.tags && Array.isArray(item.tags)) {
        for (const tag of item.tags) {
          if (typeof tag === 'string') {
            tagsSet.add(tag);
          }
        }
      }
    }
    return Array.from(tagsSet);
  }

  /**
   * Executes a full-text search across portfolio titles, descriptions, and tags.
   *
   * @param query Search keywords and category filters
   * @returns A promise resolving to a paginated set of matching portfolio items
   */
  @Public()
  @Get('search')
  @ApiOperation({
    summary: 'Search portfolio items',
    description: 'Perform keyword-based search across the entire public portfolio.',
  })
  @ApiStandardResponse({ type: PortfolioItemResponseDto, isArray: true })
  async search(@Query() query: SearchPortfolioDto) {
    return this.searchService.search(query);
  }

  /**
   * Evaluates the operational status of the Portfolio service.
   *
   * @returns A promise resolving to the service health metadata
   */
  @Public()
  @Get('health')
  @ApiOperation({
    summary: 'Service health check',
    description: 'Confirm the availability and health of the portfolio microservice.',
  })
  @ApiResponse({ status: 200, description: 'Service is operational' })
  async health(): Promise<{ status: string; service: string }> {
    return { status: 'ok', service: 'portfolio' };
  }

  /**
   * Returns published projects sorted for timeline display (title + dates only).
   */
  @Public()
  @Get('timeline')
  @Cacheable({ ttl: 3600 })
  @ApiOperation({
    summary: 'Portfolio project timeline',
    description: 'Chronological list of published projects with minimal fields for timeline UIs.',
  })
  @ApiStandardResponse({ type: PortfolioTimelineItemDto, isArray: true })
  async getTimeline() {
    return this.portfolioService.findPublishedTimeline();
  }

  /**
   * Retrieves detailed information for a specific portfolio item by ID or slug.
   */
  @Public()
  @Get(':idOrSlug')
  @Cacheable({ ttl: 1800 })
  @ApiOperation({ summary: 'Get portfolio item details' })
  @ApiParam({ name: 'idOrSlug', description: 'Item UUID or URL slug' })
  @ApiStandardResponse({ type: PortfolioItemResponseDto })
  async getDetail(@Param('idOrSlug') idOrSlug: string) {
    const item = await this.portfolioService.findByIdOrSlug(idOrSlug, { publicOnly: true });
    return this.publicMapper.toPublicItem(item as any);
  }

  /**
   * Records a view for analytics (debounced per viewer IP).
   */
  @Public()
  @Post(':idOrSlug/view')
  @ApiOperation({ summary: 'Record portfolio item view' })
  @ApiParam({ name: 'idOrSlug', description: 'Item UUID or URL slug' })
  async recordView(@Param('idOrSlug') idOrSlug: string, @Req() req: Request) {
    try {
      const item = await this.portfolioService.findByIdOrSlug(idOrSlug, { publicOnly: true });
      const ip = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
      const ipHash = Buffer.from(ip).toString('base64');
      const result = await this.analyticsService.trackView(item.id, ipHash);
      return { success: true, ...result };
    } catch {
      return { success: false, recorded: false, viewCount: 0 };
    }
  }

  /**
   * Toggles a like on a portfolio item (authenticated user or anonymous IP session).
   */
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post(':idOrSlug/like')
  @ApiOperation({ summary: 'Toggle like on portfolio item' })
  @ApiParam({ name: 'idOrSlug', description: 'Item UUID or URL slug' })
  @ApiResponse({ status: 200, description: 'Like toggled successfully' })
  async toggleLike(@Param('idOrSlug') idOrSlug: string, @Req() req: Request) {
    const item = await this.portfolioService.findByIdOrSlug(idOrSlug, { publicOnly: true });
    const ipHash = Buffer.from(req.ip || 'unknown').toString('base64');
    const userId = (req.user as AuthenticatedUser | null | undefined)?.userId;
    return this.likesService.toggleLike(item.id, userId, ipHash);
  }
}
