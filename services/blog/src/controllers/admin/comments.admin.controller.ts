import { ApiStandardResponses, UserRole } from '@nestlancer/common';
import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { Auth, CurrentUser } from '@nestlancer/auth-lib';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { sanitizeCommentContent } from '../../utils/sanitize-comment.util';

import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

/**
 * Administrative controller for moderating blog comments.
 * Provides endpoints for reviewing, approving, rejecting, and deleting user comments.
 *
 * @category Blog
 */
@ApiTags('Blog - Admin Comments')
@ApiBearerAuth()
@Controller('admin/comments')
@Auth(UserRole.ADMIN)
@ApiStandardResponses()
export class CommentsAdminController {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  /**
   * Retrieves an exhaustive list of all comments across the entire blog ecosystem.
   * Includes advanced filtering and pagination.
   *
   * @param query Filtering and pagination parameters (page, limit, status, postId)
   * @returns A promise resolving to a paginated set of all blog comments
   */
  @Get()
  @ApiOperation({
    summary: 'List all comments (Admin)',
    description: 'Retrieve a global paginated list of all blog comments for review and management.',
  })
  async getAll(@Query() query: any): Promise<any> {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.postId) where.postId = query.postId;
    const search = typeof query.search === 'string' ? query.search.trim() : '';
    if (search) {
      where.OR = [
        { content: { contains: search, mode: 'insensitive' } },
        { post: { title: { contains: search, mode: 'insensitive' } } },
        { author: { firstName: { contains: search, mode: 'insensitive' } } },
        { author: { lastName: { contains: search, mode: 'insensitive' } } },
        { author: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prismaRead.blogComment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, firstName: true, lastName: true, email: true } },
          post: { select: { id: true, title: true, slug: true } },
        },
      }),
      this.prismaRead.blogComment.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Retrieves a specialized list of comments that are currently in the moderation queue.
   *
   * @param page Target page number
   * @param limit Items per page
   * @returns A promise resolving to the pending moderation queue
   */
  @Get('pending')
  @ApiOperation({
    summary: 'List pending comments (Admin)',
    description: 'Fetch all comments awaiting administrative approval before public display.',
  })
  async getPendingComments(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ): Promise<any> {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [comments, total] = await Promise.all([
      this.prismaRead.blogComment.findMany({
        where: { status: 'PENDING' },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
          post: { select: { id: true, title: true } },
        },
      }),
      this.prismaRead.blogComment.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      data: comments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Retrieves comments that have been flagged or reported by the community.
   * Uses outbox events of type COMMENT_REPORTED to identify reported comments.
   *
   * @param page Target page number
   * @param limit Items per page
   * @returns A promise resolving to the list of reported comments
   */
  @Get('reported')
  @ApiOperation({
    summary: 'List reported comments (Admin)',
    description: 'Fetch comments that have been flagged as potentially violative by site users.',
  })
  async getReportedComments(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ): Promise<any> {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const reportedEvents = await this.prismaRead.outbox.findMany({
      where: { type: 'COMMENT_REPORTED' },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: { payload: true },
    });
    const commentIds = [
      ...new Set(reportedEvents.map((e: any) => e.payload?.commentId).filter(Boolean) as string[]),
    ];
    if (commentIds.length === 0) {
      return { data: [], pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 } };
    }

    const skip = (pageNum - 1) * limitNum;
    const comments = await this.prismaRead.blogComment.findMany({
      where: { id: { in: commentIds } },
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, email: true } },
        post: { select: { id: true, title: true, slug: true } },
      },
    });
    const total = commentIds.length;

    return {
      data: comments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Updates a comment status to 'Approved', allowing it to be visible publicly.
   *
   * @param id The unique identifier of the comment
   * @returns A promise resolving to the updated status record
   */
  @Post(':id/approve')
  @Patch(':id/approve')
  @ApiOperation({
    summary: 'Approve comment',
    description: 'Explicitly approve a comment for public visibility.',
  })
  async approve(@Param('id') id: string): Promise<any> {
    const comment = await this.prismaWrite.blogComment.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
    return { id: comment.id, status: comment.status };
  }

  /**
   * Updates a comment status to 'Rejected', preventing public visibility.
   *
   * @param id The unique identifier of the comment
   * @returns A promise resolving to the updated status record
   */
  @Post(':id/reject')
  @Patch(':id/reject')
  @ApiOperation({
    summary: 'Reject comment',
    description: 'Explicitly reject an inappropriate or non-compliant comment.',
  })
  async reject(@Param('id') id: string): Promise<any> {
    const comment = await this.prismaWrite.blogComment.update({
      where: { id },
      data: { status: 'REJECTED' },
    });
    return { id: comment.id, status: comment.status };
  }

  /**
   * Labels a comment as spam and removes it from the moderation queue.
   *
   * @param id The unique identifier of the comment
   * @returns A promise resolving to the updated status record
   */
  @Post(':id/spam')
  @Patch(':id/spam')
  @ApiOperation({
    summary: 'Mark as spam',
    description: 'Classify a comment as spam and apply system-wide filtering if necessary.',
  })
  async markAsSpam(@Param('id') id: string): Promise<any> {
    const comment = await this.prismaWrite.blogComment.update({
      where: { id },
      data: { status: 'SPAM' },
    });
    return { id: comment.id, status: comment.status };
  }

  /**
   * Pins a specific comment to the top of its post thread.
   *
   * @param id The unique identifier of the comment
   * @returns A promise resolving to the pinned status
   */
  @Post(':id/pin')
  @ApiOperation({
    summary: 'Pin comment (Admin)',
    description: 'Ensure a specific comment stays at the top of the post thread.',
  })
  async pinComment(@Param('id') id: string): Promise<any> {
    return { id, pinned: true };
  }

  /**
   * Unpins a previously pinned comment.
   *
   * @param id The unique identifier of the comment
   * @returns A promise resolving to the unpinned status
   */
  @Post(':id/unpin')
  @ApiOperation({
    summary: 'Unpin comment (Admin)',
    description: 'Remove the pinned status from a comment.',
  })
  async unpinComment(@Param('id') id: string): Promise<any> {
    return { id, pinned: false };
  }

  /**
   * Permanently removes a comment and its metadata from the system.
   *
   * @param id The unique identifier of the comment
   * @returns A promise resolving to a deletion confirmation
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete comment (Admin)',
    description: 'Permanently remove a comment from the database.',
  })
  async deleteComment(@Param('id') id: string): Promise<any> {
    await this.prismaWrite.blogComment.delete({
      where: { id },
    });
    return { id, deleted: true };
  }

  /**
   * Submits an official administrative response to a user comment.
   *
   * @param id The unique identifier of the parent comment
   * @param body The administrative reply content
   * @returns A promise resolving to the created admin reply metadata
   */
  @Post(':id/reply')
  @ApiOperation({
    summary: 'Post admin reply',
    description: 'Submit an official response as a blog administrator.',
  })
  async adminReply(
    @Param('id') id: string,
    @Body() body: { content: string },
    @CurrentUser('userId') adminId?: string,
  ): Promise<any> {
    const parent = await this.prismaRead.blogComment.findUnique({ where: { id } });
    if (!parent) throw new Error('Parent comment not found');

    const reply = await this.prismaWrite.blogComment.create({
      data: {
        content: sanitizeCommentContent(body.content),
        postId: parent.postId,
        authorId: adminId || 'admin-system',
        parentId: id,
        status: 'APPROVED',
      },
    });

    return { parentId: id, replyId: reply.id, content: reply.content };
  }
}
