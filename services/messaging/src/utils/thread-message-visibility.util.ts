import type { Prisma } from '@prisma/client';

export type ThreadMemberStintRow = {
  joinedAt: Date;
  leftAt: Date | null;
  userSentMessage: boolean;
  leftReason?: 'LEFT' | 'REMOVED' | null;
};

export type MessageVisibilityWindow = {
  from: Date;
  to: Date;
};

/** Build OR windows for messages visible to a user in a thread. */
export function buildMessageVisibilityWindows(
  stints: ThreadMemberStintRow[],
  now = new Date(),
): MessageVisibilityWindow[] {
  if (stints.length === 0) return [];

  const sorted = [...stints].sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
  const active = sorted.find((s) => !s.leftAt);
  const completed = sorted.filter((s) => s.leftAt);

  const windows: MessageVisibilityWindow[] = [];

  if (active) {
    for (const stint of completed) {
      if (stint.userSentMessage && stint.leftAt) {
        windows.push({ from: stint.joinedAt, to: stint.leftAt });
      }
    }
    windows.push({ from: active.joinedAt, to: now });
    return windows;
  }

  const last = completed[completed.length - 1];
  if (last?.leftAt) {
    windows.push({ from: last.joinedAt, to: last.leftAt });
  }

  return windows;
}

export function buildMessageVisibilityWhere(
  stints: ThreadMemberStintRow[],
  now = new Date(),
): Prisma.MessageWhereInput | null {
  const windows = buildMessageVisibilityWindows(stints, now);
  if (windows.length === 0) return null;

  return {
    OR: windows.map((w) => ({
      createdAt: { gte: w.from, lte: w.to },
    })),
  };
}

export function resolveMembershipStatus(
  stints: ThreadMemberStintRow[],
): 'ACTIVE' | 'LEFT' | 'REMOVED' | null {
  if (stints.length === 0) return null;
  const sorted = [...stints].sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
  const active = sorted.find((s) => !s.leftAt);
  if (active) return 'ACTIVE';
  const last = sorted[sorted.length - 1];
  if (!last?.leftAt) return null;
  return last.leftReason === 'REMOVED' ? 'REMOVED' : 'LEFT';
}

export function isMessageVisible(
  createdAt: Date,
  stints: ThreadMemberStintRow[],
  now = new Date(),
): boolean {
  const time = createdAt.getTime();
  return buildMessageVisibilityWindows(stints, now).some(
    (w) => time >= w.from.getTime() && time <= w.to.getTime(),
  );
}
