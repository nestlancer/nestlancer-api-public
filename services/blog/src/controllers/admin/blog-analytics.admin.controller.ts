import { ApiStandardResponses, UserRole } from '@nestlancer/common';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { Auth } from '@nestlancer/auth-lib';
import { PrismaReadService } from '@nestlancer/database';

import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

/**
 * Administrative controller for blog-wide analytics and performance tracking.
 * Provides endpoints for monitoring views, engagement, and content popularity.
 *
 * @category Blog
 */
@ApiTags('Blog - Admin Analytics')
@ApiBearerAuth()
@Controller('admin/blog/analytics')
@Auth(UserRole.ADMIN)
@ApiStandardResponses()
export class BlogAnalyticsAdminController {
  constructor(private readonly prismaRead: PrismaReadService) {}

  /**
   * Retrieves high-level blog performance metrics.
   *
   * @param query Filtering parameters for the analytics period
   * @returns A promise resolving to a summary of views, likes, and top content
   */
  @Get()
  @ApiOperation({
    summary: 'Get general analytics',
    description: 'Retrieve aggregated performance data for the entire blog service.',
  })
  async getAnalytics(@Query() query: any): Promise<any> {
    const period = (query.period as string) || '30d';
    const dateAfter = new Date();
    if (period === '7d') dateAfter.setDate(dateAfter.getDate() - 7);
    else if (period === '30d') dateAfter.setDate(dateAfter.getDate() - 30);
    else if (period === '90d') dateAfter.setDate(dateAfter.getDate() - 90);
    else dateAfter.setTime(0);

    const wherePublished = { status: 'PUBLISHED' as const, publishedAt: { gte: dateAfter } };
    const [aggregate, topPosts] = await Promise.all([
      this.prismaRead.blogPost.aggregate({
        _sum: { viewCount: true, likeCount: true },
        where: wherePublished,
      }),
      this.prismaRead.blogPost.findMany({
        where: wherePublished,
        orderBy: [{ viewCount: 'desc' }, { likeCount: 'desc' }],
        take: 10,
        select: {
          id: true,
          title: true,
          slug: true,
          viewCount: true,
          likeCount: true,
          publishedAt: true,
        },
      }),
    ]);

    return {
      totalViews: aggregate._sum.viewCount ?? 0,
      totalLikes: aggregate._sum.likeCount ?? 0,
      topPosts,
      period,
    };
  }

  /**
   * Retrieves the most viewed or shared blog posts within a period.
   *
   * @param period The time range for analytics (e.g., '30d', '7d')
   * @param limit Number of items to return
   * @returns A promise resolving to a list of top-performing blog posts
   */
  @Get('top-posts')
  @ApiOperation({
    summary: 'Get top posts',
    description: 'Fetch the most popular blog posts based on traffic and engagement.',
  })
  async getTopPosts(
    @Query('period') period: string = '30d',
    @Query('limit') limit: string = '10',
  ): Promise<any> {
    const take = parseInt(limit, 10);
    let dateAfter = new Date();

    // Basic period mapping
    if (period === '7d') dateAfter.setDate(dateAfter.getDate() - 7);
    else if (period === '30d') dateAfter.setDate(dateAfter.getDate() - 30);
    else if (period === '90d') dateAfter.setDate(dateAfter.getDate() - 90);
    else dateAfter = new Date(0); // all time

    const posts = await this.prismaRead.blogPost.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { gte: dateAfter },
      },
      orderBy: { viewCount: 'desc' },
      take,
      select: { id: true, title: true, slug: true, viewCount: true, publishedAt: true },
    });

    return { period, data: posts };
  }

  /**
   * Retrieves engagement specific metrics (likes, comments, shares).
   *
   * @param from Start date for the analytics period
   * @param to End date for the analytics period
   * @returns A promise resolving to detailed engagement statistics
   */
  @Get('engagement')
  @ApiOperation({
    summary: 'Get engagement metrics',
    description: 'Retrieve detailed interaction data including likes, comments, and shares.',
  })
  async getEngagement(@Query('from') from?: string, @Query('to') to?: string): Promise<any> {
    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const filterArgs = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    const [viewsResult, commentsCount, likesCount, sharesCount] = await Promise.all([
      this.prismaRead.blogPost.aggregate({
        _sum: { viewCount: true },
        where: Object.keys(dateFilter).length > 0 ? { publishedAt: dateFilter } : {},
      }),
      this.prismaRead.blogComment.count({
        where: Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {},
      }),
      this.prismaRead.postLike.count({ where: filterArgs }),
      this.prismaRead.outbox.count({
        where: {
          type: 'POST_SHARED',
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
        },
      }),
    ]);

    return {
      period: { from, to },
      views: viewsResult._sum.viewCount || 0,
      likes: likesCount,
      comments: commentsCount,
      shares: sharesCount,
      avgTimeOnPage: 0, // Requires client-side tracking, placeholder for now
    };
  }

  /**
   * Retrieves detailed analytics for a specific blog post.
   *
   * @param id The unique identifier of the post
   * @returns A promise resolving to a performance breakdown for the single post
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get single post analytics',
    description: 'Retrieve deep-dive performance data for a specific blog post entry.',
  })
  async getPostAnalytics(@Param('id') id: string): Promise<any> {
    const [post, comments, likes] = await Promise.all([
      this.prismaRead.blogPost.findUnique({
        where: { id },
        select: { id: true, viewCount: true },
      }),
      this.prismaRead.blogComment.count({ where: { postId: id } }),
      this.prismaRead.postLike.count({ where: { postId: id } }),
    ]);

    if (!post) {
      return { error: 'Post not found' };
    }

    return {
      postId: id,
      views: post.viewCount,
      uniqueViews: Math.floor(post.viewCount * 0.8), // Est unique views
      likes,
      comments,
      shares: 0, // Would query outbox or similar stream
      avgReadTime: 0,
    };
  }
}
