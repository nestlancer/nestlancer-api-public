import { Injectable } from '@nestjs/common';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';

export type ThreadUserPrefs = {
  threadId: string;
  userId: string;
  userArchivedAt: Date | null;
  userHiddenAt: Date | null;
};

@Injectable()
export class ThreadUserPrefsService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
  ) {}

  async getPrefsForUserThreads(
    userId: string,
    threadIds: string[],
  ): Promise<Map<string, ThreadUserPrefs>> {
    if (threadIds.length === 0) return new Map();
    const rows = await this.prismaRead.chatThreadUserPrefs.findMany({
      where: { userId, threadId: { in: threadIds } },
    });
    return new Map(
      rows.map((row) => [
        row.threadId,
        {
          threadId: row.threadId,
          userId: row.userId,
          userArchivedAt: row.userArchivedAt,
          userHiddenAt: row.userHiddenAt,
        },
      ]),
    );
  }

  async getPrefs(userId: string, threadId: string): Promise<ThreadUserPrefs | null> {
    const row = await this.prismaRead.chatThreadUserPrefs.findUnique({
      where: { threadId_userId: { threadId, userId } },
    });
    if (!row) return null;
    return {
      threadId: row.threadId,
      userId: row.userId,
      userArchivedAt: row.userArchivedAt,
      userHiddenAt: row.userHiddenAt,
    };
  }

  async userArchive(userId: string, threadId: string) {
    const now = new Date();
    return this.prismaWrite.chatThreadUserPrefs.upsert({
      where: { threadId_userId: { threadId, userId } },
      create: { threadId, userId, userArchivedAt: now },
      update: { userArchivedAt: now, userHiddenAt: null },
    });
  }

  async userUnarchive(userId: string, threadId: string) {
    const existing = await this.prismaRead.chatThreadUserPrefs.findUnique({
      where: { threadId_userId: { threadId, userId } },
    });
    if (!existing) return null;
    return this.prismaWrite.chatThreadUserPrefs.update({
      where: { threadId_userId: { threadId, userId } },
      data: { userArchivedAt: null },
    });
  }

  async userHide(userId: string, threadId: string) {
    const now = new Date();
    return this.prismaWrite.chatThreadUserPrefs.upsert({
      where: { threadId_userId: { threadId, userId } },
      create: { threadId, userId, userHiddenAt: now },
      update: { userHiddenAt: now, userArchivedAt: null },
    });
  }

  isHidden(prefs: ThreadUserPrefs | null | undefined): boolean {
    return Boolean(prefs?.userHiddenAt);
  }

  isUserArchived(prefs: ThreadUserPrefs | null | undefined): boolean {
    return Boolean(prefs?.userArchivedAt);
  }
}
