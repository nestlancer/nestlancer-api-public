import { Controller, Get, Post, Delete, Param, Query, Body, HttpCode } from '@nestjs/common';
import { ApiStandardResponses } from '@nestlancer/common';
import { Prisma } from '@prisma/client';
import { Auth, CurrentUser } from '@nestlancer/auth-lib';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  MODERATION_REMOVED_NOTICE,
  isModerationRemoved,
  readReactions,
  recordModerationEvent,
} from '../../moderation/moderation.helpers';

/**
 * Administrative controller for global messaging oversight.
 * Provides endpoints for monitoring, moderation, and system-wide messaging analytics.
 *
 * @category Messaging
 */
@ApiTags('Messaging - Admin')
@ApiBearerAuth()
@Auth('ADMIN')
@Controller('admin/messages')
@ApiStandardResponses()
export class MessagesAdminController {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
  ) {}

  /**
   * Retrieves a paginated list of all messages sent across the entire platform.
   *
   * @param query Pagination and filtering parameters
   * @returns Paginated list of all platform messages
   */
  @Get()
  @ApiOperation({
    summary: 'List all platform messages',
    description: 'Administrative view of every message sent between users.',
  })
  async getAllMessages(@Query() query: any): Promise<any> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prismaRead.message.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        },
      }),
      this.prismaRead.message.count(),
    ]);

    return { status: 'success', items, meta: { total, page, limit } };
  }

  /**
   * Forcefully deletes a message from the system for moderation purposes.
   *
   * @param id The ID of the message to delete
   * @returns Confirmation of deletion
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Force delete message',
    description: 'Permanently remove a message regardless of authorship.',
  })
  async deleteMessage(@Param('id') id: string): Promise<any> {
    const existing = await this.prismaWrite.message.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Message not found');
    }
    await this.prismaWrite.message.delete({ where: { id } });
    return { status: 'success' };
  }

  /**
   * Retrieves high-level statistics about messaging activity.
   *
   * @returns Messaging activity statistics
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get global messaging stats',
    description: 'Retrieve platform-wide counts of messages and active conversations.',
  })
  async getMessageStats(): Promise<any> {
    const [totalMessages, chatGroups] = await Promise.all([
      this.prismaRead.message.count(),
      this.prismaRead.message.groupBy({
        by: ['projectId'],
        where: { projectId: { not: null } },
      }),
    ]);
    return { status: 'success', totalMessages, activeChats: chatGroups.length };
  }

  /**
   * Detailed analytics on messaging trends and user engagement.
   *
   * @returns Messaging analytics data
   */
  @Get('analytics')
  @ApiOperation({
    summary: 'Get messaging analytics',
    description: 'Fetch time-series data and engagement metrics for messaging.',
  })
  async getMessagingAnalytics(): Promise<any> {
    return this.getMessageStats();
  }

  /**
   * Lists all active project conversations for administrative review.
   * Each conversation is a project with at least one message; returns latest message per project.
   *
   * @param query Filtering and pagination parameters (page, limit)
   * @returns List of project conversations
   */
  @Get('conversations')
  @ApiOperation({
    summary: 'List all conversations',
    description: 'Administrative view of all active chat threads in the system.',
  })
  async getAdminConversations(@Query() query: any): Promise<any> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const projectIds = await this.prismaRead.message
      .findMany({
        where: { deletedAt: null, projectId: { not: null } },
        distinct: ['projectId'],
        select: { projectId: true },
        orderBy: { createdAt: 'desc' },
      })
      .then((rows) => rows.map((r) => r.projectId as string));
    const uniqueProjectIds = [...new Set(projectIds)];
    const total = uniqueProjectIds.length;
    const paginatedIds = uniqueProjectIds.slice(skip, skip + limit);

    if (paginatedIds.length === 0) {
      return { status: 'success', data: [], pagination: { page, limit, total } };
    }

    const projectsWithLatest = await this.prismaRead.project.findMany({
      where: { id: { in: paginatedIds } },
      select: {
        id: true,
        title: true,
        status: true,
        clientId: true,
        adminId: true,
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    const data = projectsWithLatest.map((p) => ({
      projectId: p.id,
      title: p.title,
      status: p.status,
      clientId: p.clientId,
      adminId: p.adminId,
      latestMessage: (p as any).messages?.[0] ?? null,
    }));

    return { status: 'success', data, pagination: { page, limit, total } };
  }

  /**
   * Retrieves all messages exchanged within a specific project.
   *
   * @param projectId The project ID to audit
   * @returns List of messages for the project
   */
  @Get('project/:projectId')
  @ApiOperation({
    summary: 'Get project messages',
    description: 'Fetch the entire chat history for a specific project.',
  })
  async adminGetMessages(@Param('projectId') projectId: string): Promise<any> {
    const messages = await this.prismaRead.message.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: { sender: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
    return { status: 'success', projectId, messages };
  }

  /**
   * Flags a specific message for manual moderation.
   *
   * @param id The message ID to flag
   * @returns Confirmation of flagging
   */
  @Post(':id/flag')
  @ApiOperation({
    summary: 'Flag message',
    description: 'Mark a message as potentially violating terms for internal review.',
  })
  @HttpCode(200)
  async flagMessage(
    @CurrentUser('userId') adminId: string,
    @Param('id') id: string,
  ): Promise<any> {
    const message = await this.prismaWrite.message.findUnique({ where: { id } });
    if (!message) throw new Error('Message not found');

    const reactions = readReactions(message.reactions);
    reactions.flagged = true;
    reactions.flaggedBy = adminId;
    reactions.flaggedAt = new Date().toISOString();
    delete reactions.moderationRemoved;
    delete reactions.dismissed;

    await this.prismaWrite.$transaction(async (tx: any) => {
      await tx.message.update({
        where: { id },
        data: { reactions: reactions as Prisma.InputJsonValue, deletedAt: null },
      });
      await recordModerationEvent(tx, {
        messageId: id,
        action: 'FLAGGED',
        actorId: adminId,
        originalContent: message.content,
        originalType: message.type,
      });
      await tx.outbox.create({
        data: {
          type: 'MESSAGE_FLAGGED',
          payload: {
            messageId: id,
            projectId: message.projectId,
            threadId: message.threadId,
            senderId: message.senderId,
            flaggedBy: adminId,
          },
        },
      });
    });
    return { status: 'success', id, flagged: true };
  }

  /**
   * Sends a system-generated broadcast message to a project's chat.
   *
   * @param projectId Destination project ID
   * @param body Message content (content: string, senderId: string for admin)
   * @returns Confirmation of broadcast
   */
  @Post('projects/:projectId/system')
  @ApiOperation({
    summary: 'Broadcast system message',
    description: 'Inject an automated system notification into a project chat stream.',
  })
  @HttpCode(200)
  async broadcastSystemMessage(
    @Param('projectId') projectId: string,
    @Body() body: { content: string; senderId?: string },
  ): Promise<any> {
    const project = await this.prismaRead.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) throw new Error('Project not found');
    const senderId =
      body.senderId ??
      (await this.prismaRead.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } }))
        ?.id;
    if (!senderId) throw new Error('No sender available for system message');
    const message = await this.prismaWrite.$transaction(async (tx: any) => {
      const msg = await tx.message.create({
        data: {
          projectId,
          threadId: null,
          senderId,
          content: body.content ?? 'System notification',
          type: 'SYSTEM',
        },
      });
      await tx.outbox.create({
        data: {
          type: 'MESSAGE_SENT',
          payload: {
            messageId: msg.id,
            projectId,
            senderId,
            messageType: 'SYSTEM',
          },
        },
      });
      return msg;
    });
    return { status: 'success', data: { projectId, messageId: message.id, sent: true } };
  }

  /**
   * Retrieves a chronological log of system-flagged messages awaiting moderation.
   * Messages are flagged via POST :id/flag (reactions.flagged = true).
   *
   * @returns A promise resolving to a collection of messages requiring administrative attention
   */
  @Get('flagged')
  @ApiOperation({
    summary: 'List flagged messages',
    description:
      'Retrieve a priority queue of messages that have been identified as potentially violating community standards.',
  })
  async getFlagged(
    @Query('userId') userId?: string,
    @Query('projectId') projectId?: string,
    @Query('page') pageStr: string = '1',
    @Query('limit') limitStr: string = '50',
  ): Promise<any> {
    const page = Math.max(1, parseInt(pageStr, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr, 10) || 50));

    const where: Prisma.MessageWhereInput = {
      deletedAt: null,
      // Filter directly in SQL for messages flagged and not moderation-removed.
      // This replaces loading 500 rows and filtering in memory.
      AND: [
        { reactions: { not: Prisma.DbNull } },
        {
          reactions: {
            path: ['flagged'],
            equals: true,
          },
        },
        {
          OR: [
            {
              reactions: {
                path: ['moderationRemoved'],
                equals: Prisma.DbNull,
              },
            },
            {
              reactions: {
                path: ['moderationRemoved'],
                not: true,
              },
            },
          ],
        },
      ],
    };
    if (projectId) {
      where.projectId = projectId;
    }
    if (userId) {
      where.OR = [{ senderId: userId }, { project: { clientId: userId } }];
    }

    const [total, pageRows] = await Promise.all([
      this.prismaRead.message.count({ where }),
      this.prismaRead.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, email: true } },
          project: { select: { id: true, title: true, clientId: true } },
          thread: { select: { id: true, type: true, title: true } },
        },
      }),
    ]);

    const flaggedByIds = [
      ...new Set(
        pageRows
          .map((m) => {
            const reactions = readReactions(m.reactions);
            return typeof reactions.flaggedBy === 'string' ? reactions.flaggedBy : null;
          })
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const flaggers =
      flaggedByIds.length > 0
        ? await this.prismaRead.user.findMany({
            where: { id: { in: flaggedByIds } },
            select: { id: true, firstName: true, lastName: true, email: true },
          })
        : [];
    const flaggerById = new Map(flaggers.map((u) => [u.id, u]));

    const data = pageRows.map((m) => {
      const reactions = readReactions(m.reactions);
      const flaggedBy =
        typeof reactions.flaggedBy === 'string' ? reactions.flaggedBy : undefined;
      const escalated = reactions.escalated === true;
      return {
        ...m,
        reviewStatus: escalated ? 'escalated' : 'flagged',
        chatKind: m.projectId ? 'project' : m.thread?.type === 'GROUP' ? 'group' : 'direct',
        flaggedAt: typeof reactions.flaggedAt === 'string' ? reactions.flaggedAt : null,
        flaggedByUser: flaggedBy ? (flaggerById.get(flaggedBy) ?? null) : null,
      };
    });

    return {
      status: 'success',
      data,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  @Get('moderation-history')
  @ApiOperation({
    summary: 'List moderation history',
    description:
      'Audit trail of flagged, escalated, removed, and restored messages for operator review and restore.',
  })
  async listModerationHistory(
    @Query('page') pageStr: string = '1',
    @Query('limit') limitStr: string = '50',
    @Query('action') action?: string,
  ): Promise<any> {
    const page = Math.max(1, parseInt(pageStr, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr, 10) || 50));
    const where: Prisma.MessageModerationEventWhereInput = {};
    const normalized = action?.toUpperCase();
    if (
      normalized &&
      ['FLAGGED', 'DISMISSED', 'ESCALATED', 'REMOVED', 'RESTORED'].includes(normalized)
    ) {
      where.action = normalized as any;
    }

    const [total, events] = await Promise.all([
      this.prismaRead.messageModerationEvent.count({ where }),
      this.prismaRead.messageModerationEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          actor: { select: { id: true, firstName: true, lastName: true, email: true } },
          message: {
            include: {
              sender: { select: { id: true, firstName: true, lastName: true, email: true } },
              project: { select: { id: true, title: true, clientId: true } },
              thread: { select: { id: true, type: true, title: true } },
            },
          },
        },
      }),
    ]);

    const data = events.map((event) => {
      const message = event.message;
      const reactions = readReactions(message?.reactions);
      return {
        ...event,
        chatKind: message?.projectId
          ? 'project'
          : message?.thread?.type === 'GROUP'
            ? 'group'
            : 'direct',
        currentStatus: isModerationRemoved(reactions)
          ? 'removed'
          : reactions.escalated === true
            ? 'escalated'
            : reactions.flagged === true
              ? 'flagged'
              : 'clear',
        canRestore:
          isModerationRemoved(reactions) ||
          reactions.escalated === true ||
          reactions.moderationCensored === true,
      };
    });

    return {
      status: 'success',
      data,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  @Post('flagged/:id/dismiss')
  @ApiOperation({
    summary: 'Dismiss flagged message',
    description: 'Clear the flagged state without deleting the message.',
  })
  @HttpCode(200)
  async dismissFlagged(
    @CurrentUser('userId') adminId: string,
    @Param('id') id: string,
  ): Promise<any> {
    const message = await this.prismaWrite.message.findUnique({ where: { id } });
    if (!message) throw new Error('Message not found');
    const reactions = readReactions(message.reactions);
    delete reactions.flagged;
    delete reactions.escalated;
    delete reactions.moderationCensored;
    reactions.dismissed = true;
    await this.prismaWrite.$transaction(async (tx: any) => {
      await tx.message.update({
        where: { id },
        data: { reactions: reactions as Prisma.InputJsonValue },
      });
      await recordModerationEvent(tx, {
        messageId: id,
        action: 'DISMISSED',
        actorId: adminId,
        originalContent: message.content,
        originalType: message.type,
      });
    });
    return { status: 'success', id, dismissed: true };
  }

  @Delete('flagged/:id')
  @ApiOperation({
    summary: 'Remove flagged message from chat',
    description:
      'Replace the chat bubble with a moderation notice, keep original text in history for restore.',
  })
  @HttpCode(200)
  async deleteFlagged(
    @CurrentUser('userId') adminId: string,
    @Param('id') id: string,
  ): Promise<any> {
    const message = await this.prismaWrite.message.findUnique({ where: { id } });
    if (!message) throw new Error('Message not found');
    const reactions = readReactions(message.reactions);
    const originalContent =
      typeof reactions.moderationOriginalContent === 'string' &&
      reactions.moderationOriginalContent.length > 0
        ? reactions.moderationOriginalContent
        : message.content;

    reactions.moderationRemoved = true;
    reactions.moderationCensored = false;
    reactions.moderationOriginalContent = originalContent;
    reactions.moderationOriginalType = message.type;
    reactions.moderationRemovedAt = new Date().toISOString();
    reactions.moderationRemovedBy = adminId;
    delete reactions.flagged;
    delete reactions.escalated;

    await this.prismaWrite.$transaction(async (tx: any) => {
      await tx.message.update({
        where: { id },
        data: {
          content: MODERATION_REMOVED_NOTICE,
          type: 'TEXT',
          deletedAt: null,
          reactions: reactions as Prisma.InputJsonValue,
        },
      });
      await recordModerationEvent(tx, {
        messageId: id,
        action: 'REMOVED',
        actorId: adminId,
        originalContent,
        originalType: message.type,
        note: MODERATION_REMOVED_NOTICE,
      });
    });
    return { status: 'success', id, deleted: true, notice: MODERATION_REMOVED_NOTICE };
  }

  @Post('flagged/:id/escalate')
  @ApiOperation({
    summary: 'Escalate flagged message',
    description:
      'Mark for senior review and censor the bubble in chat so participants cannot read it.',
  })
  @HttpCode(200)
  async escalateFlagged(
    @CurrentUser('userId') adminId: string,
    @Param('id') id: string,
  ): Promise<any> {
    const message = await this.prismaWrite.message.findUnique({ where: { id } });
    if (!message) throw new Error('Message not found');
    const reactions = readReactions(message.reactions);
    reactions.flagged = true;
    reactions.escalated = true;
    reactions.moderationCensored = true;
    reactions.escalatedAt = new Date().toISOString();
    reactions.escalatedBy = adminId;
    if (
      !(
        typeof reactions.moderationOriginalContent === 'string' &&
        reactions.moderationOriginalContent.length > 0
      )
    ) {
      reactions.moderationOriginalContent = message.content;
      reactions.moderationOriginalType = message.type;
    }

    await this.prismaWrite.$transaction(async (tx: any) => {
      await tx.message.update({
        where: { id },
        data: { reactions: reactions as Prisma.InputJsonValue },
      });
      await recordModerationEvent(tx, {
        messageId: id,
        action: 'ESCALATED',
        actorId: adminId,
        originalContent: message.content,
        originalType: message.type,
      });
    });
    return { status: 'success', id, escalated: true, censored: true };
  }

  @Post('flagged/:id/restore')
  @ApiOperation({
    summary: 'Restore moderated message',
    description:
      'Restore a removed or escalated message. Optional body.content edits the text before restore.',
  })
  @HttpCode(200)
  async restoreFlagged(
    @CurrentUser('userId') adminId: string,
    @Param('id') id: string,
    @Body() body: { content?: string } = {},
  ): Promise<any> {
    const message = await this.prismaWrite.message.findUnique({ where: { id } });
    if (!message) throw new Error('Message not found');
    const reactions = readReactions(message.reactions);

    const latestSnapshot = await this.prismaRead.messageModerationEvent.findFirst({
      where: {
        messageId: id,
        action: { in: ['REMOVED', 'ESCALATED', 'FLAGGED'] },
        originalContent: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });

    const edited =
      typeof body?.content === 'string' && body.content.trim() ? body.content.trim() : null;
    const snapshotContent =
      edited ||
      (typeof reactions.moderationOriginalContent === 'string'
        ? reactions.moderationOriginalContent
        : null) ||
      latestSnapshot?.originalContent ||
      message.content ||
      '';

    const snapshotType =
      (typeof reactions.moderationOriginalType === 'string'
        ? reactions.moderationOriginalType
        : null) ||
      latestSnapshot?.originalType ||
      message.type;

    delete reactions.flagged;
    delete reactions.escalated;
    delete reactions.moderationCensored;
    delete reactions.moderationRemoved;
    delete reactions.moderationOriginalContent;
    delete reactions.moderationOriginalType;
    delete reactions.moderationRemovedAt;
    delete reactions.moderationRemovedBy;
    delete reactions.escalatedAt;
    delete reactions.escalatedBy;
    reactions.restoredAt = new Date().toISOString();
    reactions.restoredBy = adminId;

    await this.prismaWrite.$transaction(async (tx: any) => {
      await tx.message.update({
        where: { id },
        data: {
          content: snapshotContent,
          type: snapshotType as any,
          deletedAt: null,
          editedAt: edited ? new Date() : message.editedAt,
          reactions: reactions as Prisma.InputJsonValue,
        },
      });
      await recordModerationEvent(tx, {
        messageId: id,
        action: 'RESTORED',
        actorId: adminId,
        originalContent: latestSnapshot?.originalContent ?? message.content,
        originalType: latestSnapshot?.originalType ?? message.type,
        restoredContent: snapshotContent,
        note: edited ? 'Restored with edited content' : 'Restored original content',
      });
    });

    return { status: 'success', id, restored: true, content: snapshotContent };
  }
}
