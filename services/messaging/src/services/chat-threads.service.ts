import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';
import { ChatThreadMemberLeftReason, ChatThreadType, UserRole } from '@prisma/client';
import { MessagingAccessService } from './messaging-access.service';
import { ThreadMemberStintService } from './thread-member-stint.service';
import { ThreadUserPrefsService } from './thread-user-prefs.service';
import { ChatThreadSystemMessageService } from './chat-thread-system-message.service';

@Injectable()
export class ChatThreadsService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly access: MessagingAccessService,
    private readonly stints: ThreadMemberStintService,
    private readonly userPrefs: ThreadUserPrefsService,
    private readonly config: ConfigService,
    private readonly systemMessages: ChatThreadSystemMessageService,
  ) {}

  private async loadUserRole(userId: string) {
    const u = await this.prismaRead.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, status: true },
    });
    if (!u || u.status !== 'ACTIVE') {
      throw new NotFoundException('User not found');
    }
    return u;
  }

  /**
   * Platform support admin for client “message support” (env pin or oldest active admin).
   */
  async resolveDefaultPlatformAdminUserId(): Promise<string> {
    const pinned = this.config.get<string>('messaging.supportAdminUserId');
    if (pinned) {
      const admin = await this.prismaRead.user.findFirst({
        where: { id: pinned, role: UserRole.ADMIN, status: 'ACTIVE' },
        select: { id: true },
      });
      if (!admin) {
        throw new BadRequestException('Configured support admin is not available for messaging');
      }
      return admin.id;
    }
    const admin = await this.prismaRead.user.findFirst({
      where: { role: UserRole.ADMIN, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!admin) {
      throw new BadRequestException('No support admin account is available for messaging');
    }
    return admin.id;
  }

  /**
   * Resolves the peer for POST /messages/threads/direct: explicit peer, or default admin for clients only.
   */
  async resolvePeerForDirectThread(
    currentUserId: string,
    peerUserIdInput?: string,
  ): Promise<string> {
    const trimmed = peerUserIdInput?.trim();
    if (trimmed) {
      return trimmed;
    }
    const u = await this.loadUserRole(currentUserId);
    if (u.role !== UserRole.USER) {
      throw new BadRequestException('peerUserId is required');
    }
    return this.resolveDefaultPlatformAdminUserId();
  }

  /**
   * Ensures a DIRECT thread between one ADMIN and one USER. Caller must be one of the pair.
   */
  async findOrCreateDirectThread(currentUserId: string, peerUserId: string) {
    if (currentUserId === peerUserId) {
      throw new BadRequestException('Cannot start a direct thread with yourself');
    }
    const [a, b] = await Promise.all([
      this.loadUserRole(currentUserId),
      this.loadUserRole(peerUserId),
    ]);

    const roles = new Set([a.role, b.role]);
    if (!roles.has(UserRole.ADMIN) || !roles.has(UserRole.USER)) {
      throw new BadRequestException('Direct threads are only between a client and an admin');
    }

    const candidateThreads = await this.prismaRead.chatThreadMember.findMany({
      where: { userId: { in: [currentUserId, peerUserId] } },
      select: { threadId: true },
    });
    const counts = new Map<string, number>();
    for (const row of candidateThreads) {
      counts.set(row.threadId, (counts.get(row.threadId) ?? 0) + 1);
    }
    const pairThreadIds = [...counts.entries()].filter(([, n]) => n === 2).map(([id]) => id);
    if (pairThreadIds.length > 0) {
      const direct = await this.prismaRead.chatThread.findFirst({
        where: { id: { in: pairThreadIds }, type: ChatThreadType.DIRECT },
        include: {
          members: { select: { userId: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });
      if (direct && direct.members.length === 2) {
        return direct;
      }
    }

    const createdById = a.role === UserRole.ADMIN ? a.id : b.id;
    return this.prismaWrite.$transaction(async (tx) => {
      const thread = await tx.chatThread.create({
        data: {
          type: ChatThreadType.DIRECT,
          createdById,
          members: {
            create: [{ userId: currentUserId }, { userId: peerUserId }],
          },
        },
        include: {
          members: { select: { userId: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });
      await this.stints.createActiveStints(tx, thread.id, [currentUserId, peerUserId]);
      return thread;
    });
  }

  /**
   * Admin-only: group thread with the admin + listed client user ids (USER role).
   */
  async createGroupThread(adminUserId: string, title: string | undefined, clientUserIds: string[]) {
    const admin = await this.loadUserRole(adminUserId);
    if (admin.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can create group conversations');
    }
    const uniqueClients = [...new Set(clientUserIds)];
    if (uniqueClients.length < 2) {
      throw new BadRequestException('Group chat requires at least two clients');
    }
    if (uniqueClients.includes(adminUserId)) {
      throw new BadRequestException('Invalid participant list');
    }
    const clients = await this.prismaRead.user.findMany({
      where: { id: { in: uniqueClients } },
      select: { id: true, role: true, status: true },
    });
    if (clients.length !== uniqueClients.length) {
      throw new BadRequestException('One or more client users were not found');
    }
    for (const c of clients) {
      if (c.role !== UserRole.USER) {
        throw new BadRequestException('Group members must be client users');
      }
      if (c.status !== 'ACTIVE') {
        throw new BadRequestException('All clients must be active');
      }
    }

    const trimmedTitle = title?.trim() || 'Group conversation';
    const requiredMemberIds = new Set([adminUserId, ...uniqueClients]);

    // NL-MSG-004: reuse an existing GROUP with the same title and membership set.
    const candidates = await this.prismaRead.chatThread.findMany({
      where: {
        type: ChatThreadType.GROUP,
        title: { equals: trimmedTitle, mode: 'insensitive' },
        archivedAt: null,
      },
      include: { members: { select: { userId: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
    for (const candidate of candidates) {
      const memberIds = new Set(candidate.members.map((m) => m.userId));
      if (
        memberIds.size === requiredMemberIds.size &&
        [...requiredMemberIds].every((id) => memberIds.has(id))
      ) {
        return candidate;
      }
    }

    const systemMessages: Array<{
      id: string;
      threadId: string | null;
      senderId: string;
      content: string | null;
      type: string | null;
      createdAt: Date;
    }> = [];

    const thread = await this.prismaWrite.$transaction(async (tx) => {
      const created = await tx.chatThread.create({
        data: {
          type: ChatThreadType.GROUP,
          title: trimmedTitle,
          createdById: adminUserId,
          members: {
            create: [{ userId: adminUserId }, ...uniqueClients.map((userId) => ({ userId }))],
          },
        },
        include: {
          members: { select: { userId: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });

      await this.stints.createActiveStints(tx, created.id, [adminUserId, ...uniqueClients]);

      for (const clientId of uniqueClients) {
        const msg = await this.systemMessages.createMembershipEvent(tx, {
          threadId: created.id,
          senderId: adminUserId,
          event: 'MEMBER_JOINED',
          subjectUserId: clientId,
          actorUserId: adminUserId,
        });
        systemMessages.push(msg);
      }

      for (const clientId of uniqueClients) {
        await tx.outbox.create({
          data: {
            type: 'GROUP_MEMBER_ADDED',
            payload: {
              threadId: created.id,
              threadTitle: created.title,
              addedById: adminUserId,
              recipientId: clientId,
            },
          },
        });
      }

      return created;
    });

    for (const msg of systemMessages) {
      this.systemMessages.publish(msg);
    }

    return thread;
  }

  async listThreadsForUser(userId: string, query: { page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const memberships = await this.prismaRead.chatThreadMember.findMany({
      where: { userId },
      select: { threadId: true },
    });
    const threadIds = memberships.map((m) => m.threadId);
    const total = threadIds.length;

    const threads = await this.prismaRead.chatThread.findMany({
      where: { id: { in: threadIds } },
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return {
      items: threads.map((t) => ({
        threadId: t.id,
        type: t.type,
        title: t.title,
        latestMessage: t.messages[0] ?? null,
        updatedAt: t.updatedAt,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async getThreadOrThrow(threadId: string, userId: string) {
    await this.access.requireThreadMember(userId, threadId);
    return this.prismaRead.chatThread.findUnique({
      where: { id: threadId },
      include: {
        members: { select: { userId: true, joinedAt: true } },
      },
    });
  }

  private readonly memberUserSelect = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    avatar: true,
    role: true,
  } as const;

  private mapThreadWithMembers(
    thread: {
      id: string;
      type: ChatThreadType;
      title: string | null;
      createdById: string;
      archivedAt?: Date | null;
      createdAt: Date;
      updatedAt: Date;
      members: Array<{
        userId: string;
        joinedAt: Date;
        user: {
          id: string;
          firstName: string;
          lastName: string;
          email: string;
          avatar: string | null;
          role: UserRole;
        };
      }>;
    },
    membershipStatus?: 'ACTIVE' | 'LEFT' | 'REMOVED',
  ) {
    return {
      id: thread.id,
      type: thread.type,
      title: thread.title,
      createdById: thread.createdById,
      archivedAt: thread.archivedAt ?? null,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      membershipStatus: membershipStatus ?? 'ACTIVE',
      members: thread.members.map((m) => ({
        userId: m.userId,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
    };
  }

  async getThreadDetail(threadId: string, userId: string) {
    const stints = await this.access.requireThreadHistoryAccess(userId, threadId);
    const membershipStatus = this.stints.getMembershipStatus(stints) ?? 'ACTIVE';
    const thread = await this.prismaRead.chatThread.findUnique({
      where: { id: threadId },
      include: {
        members: {
          select: {
            userId: true,
            joinedAt: true,
            user: { select: this.memberUserSelect },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
    if (!thread) {
      throw new NotFoundException('Thread not found');
    }
    const prefs = await this.userPrefs.getPrefs(userId, threadId);
    return {
      ...this.mapThreadWithMembers(thread, membershipStatus),
      userArchivedAt: prefs?.userArchivedAt?.toISOString() ?? null,
      userHiddenAt: prefs?.userHiddenAt?.toISOString() ?? null,
      membershipStints: stints.map((s) => ({
        joinedAt: s.joinedAt.toISOString(),
        leftAt: s.leftAt?.toISOString() ?? null,
        leftReason: s.leftReason ?? null,
      })),
    };
  }

  async listThreadMembers(threadId: string, userId: string) {
    const thread = await this.getThreadDetail(threadId, userId);
    return thread.members;
  }

  async updateGroupThreadTitle(adminUserId: string, threadId: string, title?: string) {
    const admin = await this.loadUserRole(adminUserId);
    if (admin.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can update group threads');
    }
    await this.access.requireThreadMember(adminUserId, threadId);
    const thread = await this.prismaRead.chatThread.findUnique({
      where: { id: threadId },
      select: { id: true, type: true },
    });
    if (!thread) {
      throw new NotFoundException('Thread not found');
    }
    if (thread.type !== ChatThreadType.GROUP) {
      throw new BadRequestException('Only group threads can be updated');
    }
    const trimmed = title?.trim();
    await this.prismaWrite.chatThread.update({
      where: { id: threadId },
      data: { title: trimmed || 'Group conversation' },
    });
    return this.getThreadDetail(threadId, adminUserId);
  }

  private async validateClientUsers(uniqueClients: string[]) {
    const clients = await this.prismaRead.user.findMany({
      where: { id: { in: uniqueClients } },
      select: { id: true, role: true, status: true },
    });
    if (clients.length !== uniqueClients.length) {
      throw new BadRequestException('One or more client users were not found');
    }
    for (const c of clients) {
      if (c.role !== UserRole.USER) {
        throw new BadRequestException('Group members must be client users');
      }
      if (c.status !== 'ACTIVE') {
        throw new BadRequestException('All clients must be active');
      }
    }
  }

  async addGroupMembers(adminUserId: string, threadId: string, clientUserIds: string[]) {
    const admin = await this.loadUserRole(adminUserId);
    if (admin.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can manage group members');
    }
    await this.access.requireThreadMember(adminUserId, threadId);
    const thread = await this.prismaRead.chatThread.findUnique({
      where: { id: threadId },
      select: { id: true, type: true },
    });
    if (!thread) {
      throw new NotFoundException('Thread not found');
    }
    if (thread.type !== ChatThreadType.GROUP) {
      throw new BadRequestException('Members can only be added to group threads');
    }

    const uniqueClients = [...new Set(clientUserIds)].filter((id) => id !== adminUserId);
    if (uniqueClients.length === 0) {
      throw new BadRequestException('Provide at least one client to add');
    }
    await this.validateClientUsers(uniqueClients);

    const existing = await this.prismaRead.chatThreadMember.findMany({
      where: { threadId, userId: { in: uniqueClients } },
      select: { userId: true },
    });
    const existingIds = new Set(existing.map((m) => m.userId));
    const toAdd = uniqueClients.filter((id) => !existingIds.has(id));
    if (toAdd.length === 0) {
      throw new BadRequestException('All selected users are already in this group');
    }

    const systemMessages: Array<{
      id: string;
      threadId: string | null;
      senderId: string;
      content: string | null;
      type: string | null;
      createdAt: Date;
    }> = [];

    await this.prismaWrite.$transaction(async (tx) => {
      await tx.chatThreadMember.createMany({
        data: toAdd.map((userId) => ({ threadId, userId })),
        skipDuplicates: true,
      });
      await this.stints.createActiveStints(tx, threadId, toAdd);

      for (const clientId of toAdd) {
        const msg = await this.systemMessages.createMembershipEvent(tx, {
          threadId,
          senderId: adminUserId,
          event: 'MEMBER_JOINED',
          subjectUserId: clientId,
          actorUserId: adminUserId,
        });
        systemMessages.push(msg);
      }

      const threadTitle =
        (
          await tx.chatThread.findUnique({
            where: { id: threadId },
            select: { title: true },
          })
        )?.title ?? 'Group conversation';

      for (const clientId of toAdd) {
        await tx.outbox.create({
          data: {
            type: 'GROUP_MEMBER_ADDED',
            payload: {
              threadId,
              threadTitle,
              addedById: adminUserId,
              recipientId: clientId,
            },
          },
        });
      }
    });

    for (const msg of systemMessages) {
      this.systemMessages.publish(msg);
    }

    return this.getThreadDetail(threadId, adminUserId);
  }

  async removeGroupMember(adminUserId: string, threadId: string, memberUserId: string) {
    const admin = await this.loadUserRole(adminUserId);
    if (admin.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can manage group members');
    }
    await this.access.requireThreadMember(adminUserId, threadId);
    const thread = await this.prismaRead.chatThread.findUnique({
      where: { id: threadId },
      select: { id: true, type: true },
    });
    if (!thread) {
      throw new NotFoundException('Thread not found');
    }
    if (thread.type !== ChatThreadType.GROUP) {
      throw new BadRequestException('Members can only be removed from group threads');
    }
    if (memberUserId === adminUserId) {
      throw new BadRequestException('Admins cannot remove themselves from a group');
    }

    const members = await this.prismaRead.chatThreadMember.findMany({
      where: { threadId },
      select: { userId: true, user: { select: { role: true } } },
    });
    const target = members.find((m) => m.userId === memberUserId);
    if (!target) {
      throw new NotFoundException('Member not found in this group');
    }
    if (target.user.role !== UserRole.USER) {
      throw new BadRequestException('Only client members can be removed');
    }

    const clientCount = members.filter((m) => m.user.role === UserRole.USER).length;
    if (clientCount <= 1) {
      throw new BadRequestException('A group must keep at least one client');
    }

    let systemMessage: {
      id: string;
      threadId: string | null;
      senderId: string;
      content: string | null;
      type: string | null;
      createdAt: Date;
    } | null = null;

    await this.prismaWrite.$transaction(async (tx) => {
      systemMessage = await this.systemMessages.createMembershipEvent(tx, {
        threadId,
        senderId: adminUserId,
        event: 'MEMBER_REMOVED',
        subjectUserId: memberUserId,
        actorUserId: adminUserId,
      });
      await this.stints.closeActiveStint(
        tx,
        threadId,
        memberUserId,
        ChatThreadMemberLeftReason.REMOVED,
      );
      await tx.chatThreadMember.delete({
        where: { threadId_userId: { threadId, userId: memberUserId } },
      });
    });

    if (systemMessage) {
      this.systemMessages.publish(systemMessage);
    }

    return this.getThreadDetail(threadId, adminUserId);
  }

  /** Client self-leave from a group thread. */
  async leaveGroupThread(userId: string, threadId: string) {
    const user = await this.loadUserRole(userId);
    await this.access.requireThreadMember(userId, threadId);
    const thread = await this.prismaRead.chatThread.findUnique({
      where: { id: threadId },
      select: { id: true, type: true, archivedAt: true },
    });
    if (!thread) throw new NotFoundException('Thread not found');
    if (thread.type !== ChatThreadType.GROUP) {
      throw new BadRequestException('Only group threads support leaving');
    }
    if (thread.archivedAt) {
      throw new BadRequestException('This group has been archived');
    }
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Admins cannot leave a group — archive it instead');
    }

    const members = await this.prismaRead.chatThreadMember.findMany({
      where: { threadId },
      select: { userId: true, user: { select: { role: true } } },
    });
    const clientCount = members.filter((m) => m.user.role === UserRole.USER).length;
    if (clientCount <= 1) {
      throw new BadRequestException('Cannot leave — you are the only client in this group');
    }

    let systemMessage: {
      id: string;
      threadId: string | null;
      senderId: string;
      content: string | null;
      type: string | null;
      createdAt: Date;
    } | null = null;

    await this.prismaWrite.$transaction(async (tx) => {
      systemMessage = await this.systemMessages.createMembershipEvent(tx, {
        threadId,
        senderId: userId,
        event: 'MEMBER_LEFT',
        subjectUserId: userId,
      });
      await this.stints.closeActiveStint(tx, threadId, userId, ChatThreadMemberLeftReason.LEFT);
      await tx.chatThreadMember.delete({
        where: { threadId_userId: { threadId, userId } },
      });
    });

    if (systemMessage) {
      this.systemMessages.publish(systemMessage);
    }

    return { success: true };
  }

  async archiveGroupThread(adminUserId: string, threadId: string) {
    return this.archiveThread(adminUserId, threadId);
  }

  async unarchiveGroupThread(adminUserId: string, threadId: string) {
    return this.unarchiveThread(adminUserId, threadId);
  }

  /** Admin global archive — hides thread from all inboxes (direct or group). */
  async archiveThread(adminUserId: string, threadId: string) {
    const admin = await this.loadUserRole(adminUserId);
    if (admin.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can archive conversations');
    }
    await this.access.requireThreadMember(adminUserId, threadId);
    const thread = await this.prismaRead.chatThread.findUnique({
      where: { id: threadId },
      select: { id: true, type: true, archivedAt: true },
    });
    if (!thread) throw new NotFoundException('Thread not found');
    if (thread.archivedAt) {
      return this.getThreadDetail(threadId, adminUserId);
    }
    await this.prismaWrite.chatThread.update({
      where: { id: threadId },
      data: { archivedAt: new Date() },
    });
    return this.getThreadDetail(threadId, adminUserId);
  }

  async unarchiveThread(adminUserId: string, threadId: string) {
    const admin = await this.loadUserRole(adminUserId);
    if (admin.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can restore conversations');
    }
    await this.access.requireThreadMember(adminUserId, threadId);
    const thread = await this.prismaRead.chatThread.findUnique({
      where: { id: threadId },
      select: { id: true, type: true },
    });
    if (!thread) throw new NotFoundException('Thread not found');
    await this.prismaWrite.chatThread.update({
      where: { id: threadId },
      data: { archivedAt: null },
    });
    return this.getThreadDetail(threadId, adminUserId);
  }

  /** Client per-user archive — retrievable from archived inbox. */
  async userArchiveThread(userId: string, threadId: string) {
    await this.access.requireThreadHistoryAccess(userId, threadId);
    await this.userPrefs.userArchive(userId, threadId);
    return this.getThreadDetail(threadId, userId);
  }

  async userUnarchiveThread(userId: string, threadId: string) {
    await this.access.requireThreadHistoryAccess(userId, threadId);
    await this.userPrefs.userUnarchive(userId, threadId);
    return this.getThreadDetail(threadId, userId);
  }

  /** Client per-user delete — hidden from their inbox only; admin still sees full record. */
  async userHideThread(userId: string, threadId: string) {
    const user = await this.loadUserRole(userId);
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Admins cannot delete conversations — archive instead');
    }
    await this.access.requireThreadHistoryAccess(userId, threadId);
    await this.userPrefs.userHide(userId, threadId);
    return { success: true };
  }
}
