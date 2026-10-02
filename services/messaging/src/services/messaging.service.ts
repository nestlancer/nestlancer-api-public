import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { OutboxService } from '@nestlancer/outbox';
import { CreateMessageDto } from '../dto/create-message.dto';
import { UpdateMessageDto } from '../dto/update-message.dto';
import { MessagingAccessService } from './messaging-access.service';
import { MessagingRealtimePublisher } from './messaging-realtime.publisher';
import { ThreadMemberStintService } from './thread-member-stint.service';
import { UnreadCountService } from './unread-count.service';
import {
  mergeMentionsIntoReactions,
  parseMentionsFromContent,
} from '../utils/message-mentions.util';
import { sanitizeUserContent } from '@nestlancer/common';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly outbox: OutboxService,
    private readonly access: MessagingAccessService,
    private readonly realtime: MessagingRealtimePublisher,
    private readonly stints: ThreadMemberStintService,
    private readonly unreadCount: UnreadCountService,
  ) {}

  async sendMessage(userId: string, dto: CreateMessageDto) {
    const hasProject = dto.projectId != null && dto.projectId !== '';
    const hasThread = dto.threadId != null && dto.threadId !== '';
    if (hasProject === hasThread) {
      throw new BadRequestException('Provide exactly one of projectId or threadId');
    }

    if (!dto.content && dto.type === 'TEXT' && !dto.mediaId) {
      throw new BadRequestException('Content is required for text messages');
    }

    // NL-BUG-MSG-001: sanitize free-text content on ingest (notifications/emails/PDFs re-emit it).
    let messageContent = dto.content ? sanitizeUserContent(dto.content) : dto.content;
    let messageType = dto.type ?? 'TEXT';

    if (!dto.mediaId && messageType === 'TEXT' && !String(messageContent ?? '').trim()) {
      throw new BadRequestException('Message content is empty');
    }

    if (dto.mediaId) {
      const media = await this.prismaRead.media.findUnique({
        where: { id: dto.mediaId },
      });
      if (!media || media.uploaderId !== userId) {
        throw new BadRequestException('Invalid or inaccessible media attachment');
      }
      if (media.status === 'FAILED' || media.status === 'QUARANTINED') {
        throw new BadRequestException('Media attachment failed processing and cannot be sent');
      }
      if (media.status !== 'READY') {
        throw new BadRequestException(
          'Media attachment is still processing; wait until it is ready before sending',
        );
      }
      if (!media.contextType && hasProject) {
        await this.prismaWrite.media.update({
          where: { id: media.id },
          data: { contextType: 'project', contextId: dto.projectId! },
        });
      } else if (!media.contextType && hasThread) {
        await this.prismaWrite.media.update({
          where: { id: media.id },
          data: { contextType: 'thread', contextId: dto.threadId! },
        });
      } else if (
        hasProject &&
        media.contextType === 'project' &&
        media.contextId !== dto.projectId
      ) {
        throw new BadRequestException('Media attachment does not belong to this project');
      } else if (hasProject && media.contextType === 'thread') {
        throw new BadRequestException('Media attachment does not belong to this project');
      } else if (hasThread && media.contextType === 'project') {
        throw new BadRequestException('Media attachment does not belong to this conversation');
      }
      if (hasThread && media.contextType === 'thread' && media.contextId !== dto.threadId) {
        throw new BadRequestException('Media attachment does not belong to this conversation');
      }
      messageType = 'FILE';
      const caption = dto.content?.trim();
      messageContent = JSON.stringify({
        mediaId: media.id,
        filename: media.filename,
        mimeType: media.mimeType,
        size: media.size,
        ...(caption ? { caption: sanitizeUserContent(caption, 5000) } : {}),
      });
    }

    if (dto.replyToId) {
      const parent = await this.prismaRead.message.findUnique({
        where: { id: dto.replyToId },
        select: { projectId: true, threadId: true, deletedAt: true },
      });
      if (!parent || parent.deletedAt) {
        throw new NotFoundException('Parent message not found');
      }
      if (hasProject && parent.projectId !== dto.projectId) {
        throw new BadRequestException('Reply does not belong to this project');
      }
      if (hasThread && parent.threadId !== dto.threadId) {
        throw new BadRequestException('Reply does not belong to this thread');
      }
    }

    if (hasProject) {
      await this.access.requireProjectMessagingAllowed(userId, dto.projectId!);
    } else {
      await this.access.requireThreadMember(userId, dto.threadId!);
    }

    const message = await this.persistMessageWithRetry(userId, dto, {
      hasProject,
      hasThread,
      messageContent,
      messageType,
    });

    // Point attachment at the message for library source filters (Messages tab).
    if (dto.mediaId) {
      const attached = await this.prismaWrite.media.update({
        where: { id: dto.mediaId },
        data: { contextType: 'message', contextId: message.id },
      });

      // Clean abandoned PENDING stubs from failed presigned→direct fallback
      // (same uploader/filename/thread|project within the last 15 minutes).
      await this.prismaWrite.media.deleteMany({
        where: {
          id: { not: dto.mediaId },
          uploaderId: userId,
          status: 'PENDING',
          filename: attached.filename,
          createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
          OR: [
            ...(hasThread
              ? [{ contextType: 'thread' as const, contextId: dto.threadId! }]
              : []),
            ...(hasProject
              ? [{ contextType: 'project' as const, contextId: dto.projectId! }]
              : []),
            { contextType: null },
          ],
        },
      });
    }

    this.publishChatMessageRealtime(message);

    // Side effects must not turn a committed send into a 500 — the client would
    // retry and either lose the message or duplicate it (NL-BUG-MSG-001).
    try {
      if (hasThread) {
        await this.prismaWrite.chatThread.update({
          where: { id: dto.threadId! },
          data: { updatedAt: new Date() },
        });
        await this.stints.markUserSentMessage(userId, dto.threadId!);
      }
      await this.invalidateUnreadCachesForMessage(userId, message);
    } catch (error: unknown) {
      this.logger.warn(
        `Post-send bookkeeping failed for message ${message.id}: ${(error as Error).message}`,
      );
    }

    return message;
  }

  /**
   * Concurrent sends used to update the thread row inside the insert transaction.
   * That serialized every writer on one row lock and aborted some with an unhandled
   * deadlock/timeout — the message rolled back and the client only saw 500.
   */
  private async persistMessageWithRetry(
    userId: string,
    dto: CreateMessageDto,
    ctx: {
      hasProject: boolean;
      hasThread: boolean;
      messageContent: string | undefined;
      messageType: string;
    },
  ) {
    const maxAttempts = 3;
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.prismaWrite.$transaction(
          async (tx: any) => {
            let mentionUserIds: string[] = [];
            if (ctx.hasThread && dto.content) {
              const members = await tx.chatThreadMember.findMany({
                where: { threadId: dto.threadId! },
                select: {
                  userId: true,
                  user: { select: { firstName: true, lastName: true, email: true } },
                },
              });
              mentionUserIds = parseMentionsFromContent(dto.content, members).filter(
                (id) => id !== userId,
              );
            }

            const reactionsData = mergeMentionsIntoReactions(null, mentionUserIds);

            const msg = await tx.message.create({
              data: {
                projectId: ctx.hasProject ? dto.projectId! : null,
                threadId: ctx.hasThread ? dto.threadId! : null,
                senderId: userId,
                content: ctx.messageContent,
                replyToId: dto.replyToId,
                type: ctx.messageType,
                readBy: [{ userId, readAt: new Date() }],
                reactions: reactionsData,
              },
            });

            await tx.outbox.create({
              data: {
                type: 'MESSAGE_SENT',
                payload: {
                  messageId: msg.id,
                  projectId: msg.projectId,
                  threadId: msg.threadId,
                  senderId: msg.senderId,
                  replyToId: msg.replyToId,
                  messageType: msg.type,
                },
              },
            });

            for (const mentionedUserId of mentionUserIds) {
              await tx.outbox.create({
                data: {
                  type: 'MESSAGE_MENTIONED',
                  payload: {
                    messageId: msg.id,
                    threadId: msg.threadId,
                    projectId: msg.projectId,
                    senderId: msg.senderId,
                    recipientId: mentionedUserId,
                  },
                },
              });
            }

            return msg;
          },
          { maxWait: 5_000, timeout: 8_000 },
        );
      } catch (error: unknown) {
        lastError = error;
        if (attempt === maxAttempts || !isTransientMessageWriteError(error)) throw error;
        await new Promise((resolve) => setTimeout(resolve, 40 * attempt));
      }
    }
    throw lastError;
  }

  private async invalidateUnreadCachesForMessage(
    senderId: string,
    message: { projectId: string | null; threadId: string | null },
  ): Promise<void> {
    const affected = new Set<string>([senderId]);
    try {
      if (message.threadId) {
        const members = await this.prismaRead.chatThreadMember.findMany({
          where: { threadId: message.threadId },
          select: { userId: true },
        });
        for (const m of members) affected.add(m.userId);
      } else if (message.projectId) {
        const project = await this.prismaRead.project.findUnique({
          where: { id: message.projectId },
          select: { clientId: true, adminId: true },
        });
        if (project?.clientId) affected.add(project.clientId);
        if (project?.adminId) affected.add(project.adminId);
      }
      await this.unreadCount.invalidateForUsers([...affected]);
    } catch (error: unknown) {
      this.logger.warn(
        `Unread cache invalidation failed after send: ${(error as Error).message}`,
      );
    }
  }

  /** Notifies ws-gateway (via Redis pub/sub) so other participants see REST-sent messages live. */
  private publishChatMessageRealtime(msg: {
    id: string;
    projectId: string | null;
    threadId: string | null;
    senderId: string;
    content: string | null;
    type: string | null;
    createdAt: Date;
  }): void {
    const createdAt =
      msg.createdAt instanceof Date ? msg.createdAt.toISOString() : String(msg.createdAt);
    this.realtime.publish({
      projectId: msg.projectId,
      threadId: msg.threadId,
      id: msg.id,
      senderId: msg.senderId,
      content: msg.content ?? '',
      type: msg.type ?? 'TEXT',
      createdAt,
    });
  }

  private pagination(query: { page?: number | string; limit?: number | string }, fallbackLimit = 50) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || fallbackLimit);
    return { page, limit, skip: (page - 1) * limit };
  }

  async getMessagesForProject(
    userId: string,
    projectId: string,
    query: { page?: number | string; limit?: number | string },
  ) {
    await this.access.requireProjectMessagingAllowed(userId, projectId);
    const { page, limit, skip } = this.pagination(query);

    const [items, total] = await Promise.all([
      this.prismaRead.message.findMany({
        where: { projectId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        },
      }),
      this.prismaRead.message.count({
        where: { projectId, deletedAt: null },
      }),
    ]);

    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getMessagesForThread(
    userId: string,
    threadId: string,
    query: { page?: number | string; limit?: number | string },
  ) {
    const stints = await this.access.requireThreadHistoryAccess(userId, threadId);
    const visibility = this.stints.buildMessageVisibilityWhere(stints);
    const { page, limit, skip } = this.pagination(query);

    if (!visibility) {
      return { items: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }

    const baseWhere = {
      threadId,
      deletedAt: null,
      AND: [visibility],
    };

    const [items, total] = await Promise.all([
      this.prismaRead.message.findMany({
        where: baseWhere,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        },
      }),
      this.prismaRead.message.count({ where: baseWhere }),
    ]);

    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async updateMessage(userId: string, id: string, dto: UpdateMessageDto) {
    await this.access.requireMessageAccess(userId, id);
    const message = await this.prismaRead.message.findUnique({ where: { id } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId)
      throw new BadRequestException('You can only edit your own messages');
    if (message.deletedAt) throw new BadRequestException('Cannot edit a deleted message');

    return this.prismaWrite.message.update({
      where: { id },
      data: { content: dto.content, editedAt: new Date() },
    });
  }

  async deleteMessage(userId: string, id: string) {
    await this.access.requireMessageAccess(userId, id);
    const message = await this.prismaRead.message.findUnique({ where: { id } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId)
      throw new BadRequestException('You can only delete your own messages');

    return this.prismaWrite.message.update({
      where: { id },
      data: { deletedAt: new Date(), content: null },
    });
  }
}

function isTransientMessageWriteError(error: unknown): boolean {
  const code =
    typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : '';
  if (['P2034', 'P2028', 'P2024', 'P2037', 'P1001', 'P1008', 'P1017'].includes(code)) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /deadlock detected|could not serialize|write conflict or a deadlock|Transaction already closed|expired transaction/i.test(
    message,
  );
}
