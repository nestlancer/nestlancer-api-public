import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { MessagingAccessService } from './messaging-access.service';
import { UnreadCountService } from './unread-count.service';

@Injectable()
export class MessageReadService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly access: MessagingAccessService,
    private readonly unreadCount: UnreadCountService,
  ) {}

  async markAsRead(userId: string, messageId: string) {
    await this.access.requireMessageAccess(userId, messageId);
    const message = await this.prismaRead.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');

    const readBy: any[] = Array.isArray(message.readBy) ? message.readBy : [];

    if (!readBy.find((r) => r.userId === userId)) {
      readBy.push({ userId, readAt: new Date() });

      await this.prismaWrite.message.update({
        where: { id: messageId },
        data: { readBy },
      });
      await this.unreadCount.invalidateForUsers([userId]);
    }

    return { success: true };
  }

  async markProjectMessagesAsRead(userId: string, projectId: string) {
    await this.access.requireProjectParticipant(userId, projectId);
    const unreadMessages = await this.prismaRead.message.findMany({
      where: {
        projectId,
        NOT: { senderId: userId },
      },
    });

    const toUpdate = unreadMessages.filter((msg) => {
      const readBy: any[] = Array.isArray(msg.readBy) ? msg.readBy : [];
      return !readBy.find((r) => r.userId === userId);
    });

    if (toUpdate.length === 0) return { success: true };

    await this.prismaWrite.$transaction(
      toUpdate.map((msg) => {
        const readBy: any[] = Array.isArray(msg.readBy) ? msg.readBy : [];
        readBy.push({ userId, readAt: new Date() });
        return this.prismaWrite.message.update({
          where: { id: msg.id },
          data: { readBy },
        });
      }),
    );

    await this.unreadCount.invalidateForUsers([userId]);
    return { success: true, updatedCount: toUpdate.length };
  }

  async markThreadMessagesAsRead(userId: string, threadId: string) {
    await this.access.requireThreadMember(userId, threadId);
    const unreadMessages = await this.prismaRead.message.findMany({
      where: {
        threadId,
        NOT: { senderId: userId },
      },
    });

    const toUpdate = unreadMessages.filter((msg) => {
      const readBy: any[] = Array.isArray(msg.readBy) ? msg.readBy : [];
      return !readBy.find((r) => r.userId === userId);
    });

    if (toUpdate.length === 0) return { success: true };

    await this.prismaWrite.$transaction(
      toUpdate.map((msg) => {
        const readBy: any[] = Array.isArray(msg.readBy) ? msg.readBy : [];
        readBy.push({ userId, readAt: new Date() });
        return this.prismaWrite.message.update({
          where: { id: msg.id },
          data: { readBy },
        });
      }),
    );

    await this.unreadCount.invalidateForUsers([userId]);
    return { success: true, updatedCount: toUpdate.length };
  }
}
