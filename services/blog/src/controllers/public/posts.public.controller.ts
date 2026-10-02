import { Controller, Get, Post, Param, Query, Req, Res } from '@nestjs/common';
import { ApiStandardResponses, Public } from '@nestlancer/common';
import { buildViewerKey } from '../../utils/viewer-key.util';
import { Cacheable } from '@nestlancer/cache';
import { PostsService } from '../../services/posts.service';
import { PostSearchService } from '../../services/post-search.service';
import { PostViewsService } from '../../services/post-views.service';
import { QueryPostsDto } from '../../dto/query-posts.dto';
import { SearchPostsDto } from '../../dto/search-posts.dto';

import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

/**
 * Controller for public access to blog posts.
 * Provides endpoints for listing, searching, and viewing published blog content.
 *
 * @category Blog
 */
@ApiTags('Blog - Public Posts')
@Controller('posts')
@ApiStandardResponses()
export class PostsPublicController {
  constructor(
    private readonly postsService: PostsService,
    private readonly searchService: PostSearchService,
    private readonly viewsService: PostViewsService,
  ) {}

  /**
   * Retrieves a paginated list of published blog posts based on filter criteria.
   *
   * @param query Filtering and pagination parameters including category, tag, and author
   * @returns A promise resolving to a paginated set of blog posts
   */
  @Public()
  @Get()
  @ApiOperation({
    summary: 'List published posts',
    description:
      'Retrieve a paginated list of blog posts that are currently published and visible to the public.',
  })
  @Cacheable({ ttl: 300 })
  async list(@Query() query: QueryPostsDto): Promise<any> {
    return this.postsService.findPublished(query);
  }

  /**
   * Performs a full-text search across all published blog posts.
   *
   * @param query Search parameters including the query string
   * @returns A promise resolving to matching blog post results
   */
  @Public()
  @Get('search')
  @ApiOperation({
    summary: 'Search blog posts',
    description: 'Perform a full-text search across published blog posts titles and content.',
  })
  async search(@Query() query: SearchPostsDto): Promise<any> {
    return this.searchService.search(query);
  }

  /**
   * Verifies the connectivity and operational status of the blog microservice.
   *
   * @returns A promise resolving to the technical health state
   */
  @Public()
  @Get('health')
  @ApiOperation({
    summary: 'Service health check',
    description: 'Verify that the blog microservice is online and operational.',
  })
  async health(): Promise<any> {
    return { status: 'ok', service: 'blog' };
  }

  /**
   * Retrieves comprehensive metadata and content for a specific blog post by slug.
   * View counts are updated via POST /posts/:slug/view (client) so each visitor is tracked
   * with the correct forwarded IP, not the SSR/gateway connection IP.
   *
   * @param slug The unique URL-friendly slug identifier of the post
   * @returns A promise resolving to the full post object
   */
  @Public()
  @Get(':slug')
  @ApiOperation({
    summary: 'Get post detail',
    description: 'Fetch the full content, author info, and metadata of a specific blog post.',
  })
  @Cacheable({ ttl: 300 })
  async getDetail(@Param('slug') slug: string): Promise<any> {
    return this.postsService.findPublishedBySlug(slug);
  }

  /**
   * Retrieves a collection of blog posts related to the reference post.
   *
   * @param slug The slug of the source post for finding relations
   * @returns A promise resolving to a list of related content suggestions
   */
  @Public()
  @Get(':slug/related')
  @ApiOperation({
    summary: 'Get related posts',
    description:
      'Retrieve a collection of blog posts that are semantically or taxonomically similar to the given post.',
  })
  async getRelated(@Param('slug') slug: string, @Query('limit') limit?: string): Promise<any> {
    const take = Math.min(10, Math.max(1, parseInt(limit || '5', 10)));
    const data = await this.postsService.findRelatedPublished(slug, take);
    return { data };
  }

  /**
   * Manually triggers a view increment event for a specific blog post.
   *
   * @param slug The unique slug of the post viewed
   * @param req The incoming request for IP-based view attribution
   * @returns A promise resolving to a success indicator
   */
  @Public()
  @Post(':slug/view')
  @ApiOperation({
    summary: 'Record post view',
    description: 'Explicitly record a reader view event for a specific blog post.',
  })
  async recordViewExplicit(@Param('slug') slug: string, @Req() req: any): Promise<any> {
    const userId = req.user?.userId ?? req.user?.sub ?? req.user?.id;
    const viewerKey = buildViewerKey(req, typeof userId === 'string' ? userId : undefined);
    try {
      const postId = await this.postsService.findPublishedIdBySlug(slug);
      if (!postId) return { success: false, recorded: false, viewCount: 0 };
      const result = await this.viewsService.recordView(postId, viewerKey);
      return { success: true, ...result };
    } catch {
      // Ignore views for unpublished or missing posts
      return { success: false, recorded: false, viewCount: 0 };
    }
  }

  /**
   * Retrieves the public comment thread for a specific blog post with pagination.
   *
   * @param slug The post identifier
   * @param page Target page number
   * @param limit Number of items per result set
   * @returns A promise resolving to the public comment thread
   */
  @Public()
  @Get(':slug/comments')
  @ApiOperation({
    summary: 'Get post comments',
    description: 'Retrieve the public, approved comment thread for a specific blog post.',
  })
  @Cacheable({ ttl: 60 })
  async getPostComments(
    @Param('slug') slug: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ): Promise<any> {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const postId = await this.postsService.findPublishedIdBySlug(slug);
    if (!postId) {
      return { data: [], pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 } };
    }

    const { data, total } = await this.postsService.findApprovedComments(postId, skip, limitNum);

    return {
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }
}
