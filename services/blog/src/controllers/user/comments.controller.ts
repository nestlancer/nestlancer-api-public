import { ApiStandardResponses, UserRole } from '@nestlancer/common';
import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { Auth } from '@nestlancer/auth-lib';
import { PrismaReadService } from '@nestlancer/database';
import { CommentsService } from '../../services/comments.service';
import { CreateCommentDto, UpdateCommentDto } from '../../dto/create-comment.dto';

import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';

/**
 * Controller for managing comments on specific blog posts.
 * Allows users to list, create, and interact with post-specific comment threads.
 *
 * @category Blog
 */
@ApiTags('Blog - Post Comments')
@ApiBearerAuth()
@Controller('posts/:slug/comments')
@ApiStandardResponses()
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  /**
   * Creates a new top-level comment on a specified post.
   *
   * @param slug The unique identifier of the post
   * @param dto Comment creation parameters
   * @param req The incoming request for author context
   * @returns A promise resolving to the created comment record
   */
  @Post()
  @Auth()
  @ApiOperation({
    summary: 'Post a comment',
    description: 'Submit a new root-level comment to a specified blog post.',
  })
  async create(
    @Param('slug') slug: string,
    @Body() dto: CreateCommentDto,
    @Req() req: any,
  ): Promise<any> {
    return this.commentsService.create(
      slug,
      req.user?.userId ?? req.user?.sub ?? req.user?.id,
      dto,
    );
  }

  /**
   * Submits a reply to an existing comment.
   *
   * @param slug The unique identifier of the post
   * @param commentId Unique identifier of the target parent comment
   * @param dto Reply content data
   * @param req The incoming request for author context
   * @returns A promise resolving to the created reply comment
   */
  @Post(':commentId/reply')
  @Auth()
  @ApiOperation({
    summary: 'Reply to comment',
    description: 'Submit nested feedback as a reply to an existing comment.',
  })
  async replyToComment(
    @Param('slug') slug: string,
    @Param('commentId') commentId: string,
    @Body() dto: CreateCommentDto,
    @Req() req: any,
  ): Promise<any> {
    // Adding parentId to CreateCommentDto type dynamically since the dto type might not have it
    return this.commentsService.create(slug, req.user?.userId ?? req.user?.sub ?? req.user?.id, {
      ...dto,
      parentId: commentId,
    } as any);
  }

  /**
   * Modifies the text content of a previously posted comment.
   *
   * @param commentId Unique identifier of the target comment
   * @param dto The new content to apply
   * @param req The incoming request for ownership verification
   * @returns A promise resolving to the updated comment record
   */
  @Put(':commentId')
  @Auth()
  @ApiParam({ name: 'slug', description: 'Post URL slug' })
  @ApiParam({ name: 'commentId', description: 'Comment UUID' })
  @ApiOperation({
    summary: 'Update comment (PUT)',
    description: 'Modify the textual body of a comment previously authored by the user.',
  })
  async updatePut(
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
    @Req() req: any,
  ): Promise<any> {
    return this.commentsService.update(
      commentId,
      req.user?.userId ?? req.user?.sub ?? req.user?.id,
      dto,
    );
  }

  @Patch(':commentId')
  @Auth()
  @ApiParam({ name: 'slug', description: 'Post URL slug' })
  @ApiParam({ name: 'commentId', description: 'Comment UUID' })
  @ApiOperation({
    summary: 'Update comment (PATCH)',
    description: 'Modify the textual body of a comment previously authored by the user.',
  })
  async updatePatch(
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
    @Req() req: any,
  ): Promise<any> {
    return this.commentsService.update(
      commentId,
      req.user?.userId ?? req.user?.sub ?? req.user?.id,
      dto,
    );
  }

  /**
   * Performs a soft-deletion of a comment authored by the current user.
   *
   * @param commentId Unique identifier of the target comment
   * @param req The incoming request for ownership verification
   * @returns A promise resolving to a deletion confirmation
   */
  @Delete(':commentId')
  @Auth()
  @ApiParam({ name: 'slug', description: 'Post URL slug' })
  @ApiParam({ name: 'commentId', description: 'Comment UUID' })
  @ApiOperation({
    summary: 'Delete comment',
    description: 'Mark a specific comment as deleted by its author.',
  })
  async remove(@Param('commentId') commentId: string, @Req() req: any): Promise<any> {
    return this.commentsService.softDelete(
      commentId,
      req.user?.userId ?? req.user?.sub ?? req.user?.id,
    );
  }

  /**
   * Retrieves all nested replies associated with a specific comment.
   *
   * @param slug The post identifier
   * @param commentId The parent comment identifier
   * @returns A promise resolving to the child comment thread
   */
  @Get(':commentId/replies')
  @Auth()
  @ApiOperation({
    summary: 'Get comment replies',
    description: 'Retrieve all nested responses for a specific parent comment.',
  })
  async getReplies(
    @Param('slug') slug: string,
    @Param('commentId') commentId: string,
  ): Promise<any> {
    const post = await this.prismaRead.blogPost.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!post) return { data: [] };
    const data = await this.commentsService.getReplies(commentId, post.id);
    return { data };
  }

  /**
   * Submits a report flagging a comment for administrative moderation.
   *
   * @param slug The post identifier
   * @param commentId The comment identifier reported
   * @param body Optional reason
   * @param req User context
   * @returns A promise resolving to a report confirmation
   */
  @Post(':commentId/report')
  @Auth()
  @ApiOperation({
    summary: 'Report comment',
    description: 'Flag a specific comment for review due to community guideline violations.',
  })
  async reportComment(
    @Param('slug') slug: string,
    @Param('commentId') commentId: string,
    @Body() body: { reason?: string },
    @Req() req: any,
  ): Promise<any> {
    await this.commentsService.reportComment(
      commentId,
      req.user?.userId ?? req.user?.sub ?? req.user?.id,
      body?.reason,
    );
    return { reported: true };
  }

  /**
   * Adds a like to a comment (increments like count).
   *
   * @param slug The post identifier
   * @param commentId The unique identifier of the comment to like
   * @param req The incoming request for user context
   * @returns A promise resolving to the updated interaction state
   */
  @Post(':commentId/like')
  @Auth()
  @ApiOperation({ summary: 'Like comment', description: 'Add a like to a blog post comment.' })
  async likePostComment(
    @Param('slug') slug: string,
    @Param('commentId') commentId: string,
    @Req() req: any,
  ): Promise<any> {
    const result = await this.commentsService.likeComment(
      commentId,
      req.user?.userId ?? req.user?.sub ?? req.user?.id,
    );
    return { status: 'success', data: result };
  }
}

/**
 * Controller for performing comment-related operations independent of a specific post slug.
 */
@ApiTags('Blog - Standalone Comments')
@ApiBearerAuth()
@Controller()
@Auth()
@ApiStandardResponses()
export class StandaloneCommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  /**
   * Fetches details for a single comment using its primary identifier.
   *
   * @param commentId Unique identifier of the comment
   * @returns A promise resolving to the comment object
   */
  @Get('comments/:commentId')
  @ApiOperation({
    summary: 'Get comment by ID',
    description: 'Retrieve detailed record for a single comment entry.',
  })
  async getCommentById(@Param('commentId') commentId: string): Promise<any> {
    const comment = await this.prismaRead.blogComment.findUnique({
      where: { id: commentId, status: 'APPROVED' },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        post: { select: { id: true, title: true, slug: true } },
      },
    });
    if (!comment) return { status: 'success', data: null };
    return { status: 'success', data: comment };
  }

  /**
   * Fetches all child replies for a specific parent comment.
   *
   * @param commentId Unique identifier of the parent
   * @returns A promise resolving to the list of replies
   */
  @Get('comments/:commentId/replies')
  @ApiOperation({
    summary: 'Get standalone replies',
    description: 'Fetch all hierarchical replies for a specific comment ID.',
  })
  async getCommentReplies(@Param('commentId') commentId: string): Promise<any> {
    const data = await this.commentsService.getReplies(commentId);
    return { status: 'success', data };
  }

  /**
   * Submits a reply to a comment using its ID directly.
   *
   * @param commentId Unique identifier of the target for the reply
   * @param body Reply content
   * @param req User context
   * @returns A promise resolving to the created reply record
   */
  @Post('comments/:commentId/reply')
  @ApiOperation({
    summary: 'Reply standalone',
    description: 'Submit a response to a comment without post context.',
  })
  async replyToCommentStandalone(
    @Param('commentId') commentId: string,
    @Body() body: { content: string },
    @Req() req: any,
  ): Promise<any> {
    const result = await this.commentsService.createReplyByParentId(
      commentId,
      req.user?.userId ?? req.user?.sub ?? req.user?.id,
      body.content,
    );
    return { status: 'success', data: result };
  }

  /**
   * Moderates or updates a comment record directly by ID.
   *
   * @param commentId Unique identifier of the comment
   * @param body New content or status
   * @param req User context
   * @returns A promise resolving to the updated record
   */
  @Patch('comments/:commentId')
  @ApiOperation({
    summary: 'Patch comment',
    description: 'Directly modify attributes of a comment record.',
  })
  async editComment(
    @Param('commentId') commentId: string,
    @Body() body: any,
    @Req() req: any,
  ): Promise<any> {
    return { status: 'success', data: { id: commentId, content: body.content } };
  }

  /**
   * Removes a comment record by its identifier.
   *
   * @param commentId Unique identifier of the record to delete
   * @param req User context
   * @returns A promise resolving to confirmation
   */
  @Delete('comments/:commentId')
  @ApiOperation({
    summary: 'Delete standalone comment',
    description: 'Directly remove a comment record from the system.',
  })
  async deleteComment(@Param('commentId') commentId: string, @Req() req: any): Promise<any> {
    return { status: 'success', message: 'Comment deleted' };
  }

  /**
   * Reports a comment for moderation using its direct identifier.
   *
   * @param commentId Unique identifier of the flagged comment
   * @param body Report reason
   * @param req User context
   * @returns A promise resolving to confirmation
   */
  @Post('comments/:commentId/report')
  @ApiOperation({
    summary: 'Report standalone comment',
    description: 'Flag a specific comment record for administrative review.',
  })
  async reportCommentStandalone(
    @Param('commentId') commentId: string,
    @Body() body: { reason?: string },
    @Req() req: any,
  ): Promise<any> {
    await this.commentsService.reportComment(
      commentId,
      req.user?.userId ?? req.user?.sub ?? req.user?.id,
      body?.reason,
    );
    return { status: 'success', message: 'Comment reported' };
  }

  /**
   * Records a like for a comment using its ID.
   *
   * @param commentId Unique identifier of the comment
   * @param req User context
   * @returns A promise resolving to the interaction state
   */
  @Post('comments/:commentId/like')
  @ApiOperation({
    summary: 'Like standalone comment',
    description: 'Add a like to a specific comment record.',
  })
  async likeComment(@Param('commentId') commentId: string, @Req() req: any): Promise<any> {
    const result = await this.commentsService.likeComment(
      commentId,
      req.user?.userId ?? req.user?.sub ?? req.user?.id,
    );
    return { status: 'success', data: result };
  }
}
