import { ApiStandardResponses, UserRole } from '@nestlancer/common';
import { Controller, Post, Delete, Get, Param, Query, Req } from '@nestjs/common';
import { Auth } from '@nestlancer/auth-lib';
import { PostInteractionsService } from '../../services/post-interactions.service';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';

import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';

/**
 * Controller for user interactions with specific blog posts.
 * Provides endpoints for liking posts, bookmarking, and tracking shares.
 *
 * @category Blog
 */
@ApiTags('Blog - Post Interactions')
@ApiBearerAuth()
@Controller('posts/:slug')
@ApiStandardResponses()
export class PostInteractionsController {
  constructor(
    private readonly interactionsService: PostInteractionsService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  /**
   * Toggles a 'like' reaction on a blog post for the current user.
   *
   * @param slug The unique URL-friendly identifier of the post
   * @param req Express request for user identification
   * @returns A promise resolving to the updated post interaction status
   */
  @Post('like')
  @Auth(UserRole.USER)
  @ApiOperation({ summary: 'Toggle like', description: 'Like or unlike a blog post.' })
  async toggleLike(@Param('slug') slug: string, @Req() req: any): Promise<any> {
    const userId = req.user?.userId ?? req.user?.sub ?? req.user?.id;
    return this.interactionsService.toggleLike(slug, userId);
  }

  /**
   * Returns the current user's engagement state for a post.
   */
  @Get('engagement')
  @Auth(UserRole.USER)
  @ApiOperation({
    summary: 'Get post engagement',
    description: 'Fetch like/bookmark state and counts for the authenticated user.',
  })
  async getEngagement(@Param('slug') slug: string, @Req() req: any): Promise<any> {
    const userId = req.user?.userId ?? req.user?.sub ?? req.user?.id;
    const post = await this.prismaRead.blogPost.findUnique({
      where: { slug, status: 'PUBLISHED' },
      select: { id: true, likeCount: true, viewCount: true },
    });
    if (!post) {
      return { liked: false, bookmarked: false, likeCount: 0, viewCount: 0 };
    }
    const [liked, bookmarked] = await Promise.all([
      this.interactionsService.isLiked(slug, userId),
      this.interactionsService.isBookmarked(slug, userId),
    ]);
    return {
      liked,
      bookmarked,
      likeCount: post.likeCount,
      viewCount: post.viewCount,
    };
  }

  /**
   * Adds a blog post to the user's bookmarks.
   *
   * @param slug The unique identifier of the post
   * @param req Express request for user identification
   * @returns A promise resolving to the updated post interaction status
   */
  @Post('bookmark')
  @Auth(UserRole.USER)
  @ApiOperation({
    summary: 'Bookmark post',
    description: "Save a blog post to the user's personal bookmarks.",
  })
  async addBookmark(@Param('slug') slug: string, @Req() req: any): Promise<any> {
    const userId = req.user?.userId ?? req.user?.sub ?? req.user?.id;
    return this.interactionsService.addBookmark(slug, userId);
  }

  /**
   * Removes a blog post from the user's bookmarks.
   *
   * @param slug The unique identifier of the post
   * @param req Express request for user identification
   * @returns A promise resolving to the updated post interaction status
   */
  @Delete('bookmark')
  @Auth(UserRole.USER)
  @ApiOperation({
    summary: 'Remove bookmark',
    description: "Remove a previously saved blog post from the user's bookmarks.",
  })
  async removeBookmark(@Param('slug') slug: string, @Req() req: any): Promise<any> {
    const userId = req.user?.userId ?? req.user?.sub ?? req.user?.id;
    return this.interactionsService.removeBookmark(slug, userId);
  }

  // Legacy aliases kept for backward compatibility, excluded from Swagger to avoid duplicate operationId.
  @Post('bookmarks')
  @Auth(UserRole.USER)
  @ApiExcludeEndpoint()
  async addBookmarkLegacy(@Param('slug') slug: string, @Req() req: any): Promise<any> {
    const userId = req.user?.userId ?? req.user?.sub ?? req.user?.id;
    return this.interactionsService.addBookmark(slug, userId);
  }

  @Delete('bookmarks')
  @Auth(UserRole.USER)
  @ApiExcludeEndpoint()
  async removeBookmarkLegacy(@Param('slug') slug: string, @Req() req: any): Promise<any> {
    const userId = req.user?.userId ?? req.user?.sub ?? req.user?.id;
    return this.interactionsService.removeBookmark(slug, userId);
  }

  /**
   * Tracks a view event for a specific blog post by an authenticated user.
   * Public (debounced) view tracking uses POST /posts/:slug/view on the public controller.
   */
  @Post('views')
  @Auth(UserRole.USER)
  @ApiOperation({
    summary: 'Track authenticated view',
    description: 'Record a post view specifically for a logged-in user context.',
  })
  async trackView(@Param('slug') slug: string, @Req() req: any): Promise<any> {
    const post = await this.prismaRead.blogPost.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!post) throw new Error('Post not found');

    await this.prismaWrite.blogPost.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    });

    return { tracked: true };
  }

  /**
   * Records a share event for a blog post.
   *
   * @param slug The unique identifier of the post
   * @param req User context
   * @returns A promise resolving to the success confirmation
   */
  @Post('share')
  @Auth(UserRole.USER)
  @ApiOperation({
    summary: 'Track share',
    description: 'Record that a post has been shared by the user.',
  })
  async trackShare(@Param('slug') slug: string, @Req() req: any): Promise<any> {
    const post = await this.prismaRead.blogPost.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!post) throw new Error('Post not found');

    await this.prismaWrite.outbox.create({
      data: {
        type: 'POST_SHARED',
        payload: { postId: post.id, userId: req.user?.userId ?? req.user?.sub ?? req.user?.id },
      },
    });

    return { shared: true };
  }
}

/**
 * Controller for managing a user's personal collection of bookmarked posts.
 *
 * @category Blog
 */
@ApiTags('Blog - Bookmarks')
@ApiBearerAuth()
@Controller('bookmarks')
@ApiStandardResponses()
export class BookmarksController {
  constructor(private readonly interactionsService: PostInteractionsService) {}

  /**
   * Retrieves all bookmarked posts for the current authenticated user.
   *
   * @param req Express request for user identification
   * @returns A promise resolving to a paginated list of user bookmarks
   */
  @Get()
  @Auth(UserRole.USER)
  @ApiOperation({
    summary: 'List bookmarked posts',
    description: 'Fetch all blog posts that the current user has saved to their bookmarks.',
  })
  async listBookmarks(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ): Promise<any> {
    return this.interactionsService.getUserBookmarks(
      req.user?.userId ?? req.user?.sub ?? req.user?.id,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }
}
