import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  buildGroupMembershipSystemContent,
  buildGroupMembershipSystemMetadata,
  GroupMembershipSystemEvent,
} from '../utils/chat-thread-system-message.util';
import { MessagingRealtimePublisher } from './messaging-realtime.publisher';

type Tx = Prisma.TransactionClient;

function formatUserName(
  user: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null,
): string | undefined {
  if (!user) return undefined;
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  if (name) return name;
  return user.email?.trim() || undefined;
}

@Injectable()
export class ChatThreadSystemMessageService {
  constructor(private readonly realtime: MessagingRealtimePublisher) {}

  private async resolveUserName(tx: Tx, userId: string): Promise<string | undefined> {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true },
    });
    return formatUserName(user);
  }

  async createMembershipEvent(
    tx: Tx,
    params: {
      threadId: string;
      senderId: string;
      event: GroupMembershipSystemEvent;
      subjectUserId: string;
      actorUserId?: string;
    },
  ) {
    const [subjectName, actorName] = await Promise.all([
      this.resolveUserName(tx, params.subjectUserId),
      params.actorUserId
        ? this.resolveUserName(tx, params.actorUserId)
        : Promise.resolve(undefined),
    ]);

    const eventPayload = {
      event: params.event,
      subjectUserId: params.subjectUserId,
      subjectName,
      actorUserId: params.actorUserId,
      actorName,
    };

    const content = buildGroupMembershipSystemContent(eventPayload);
    const reactions = buildGroupMembershipSystemMetadata(eventPayload);

    const msg = await tx.message.create({
      data: {
        threadId: params.threadId,
        senderId: params.senderId,
        content,
        type: 'SYSTEM',
        readBy: [],
        reactions,
      },
    });

    await tx.chatThread.update({
      where: { id: params.threadId },
      data: { updatedAt: new Date() },
    });

    await tx.outbox.create({
      data: {
        type: 'MESSAGE_SENT',
        payload: {
          messageId: msg.id,
          threadId: msg.threadId,
          senderId: msg.senderId,
          messageType: msg.type,
        },
      },
    });

    return msg;
  }

  publish(msg: {
    id: string;
    threadId: string | null;
    senderId: string;
    content: string | null;
    type: string | null;
    createdAt: Date;
  }): void {
    const createdAt =
      msg.createdAt instanceof Date ? msg.createdAt.toISOString() : String(msg.createdAt);
    this.realtime.publish({
      projectId: null,
      threadId: msg.threadId,
      id: msg.id,
      senderId: msg.senderId,
      content: msg.content ?? '',
      type: msg.type ?? 'SYSTEM',
      createdAt,
    });
  }
}
