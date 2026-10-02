export type MentionMatch = { userId: string; label: string; start: number; end: number };

/** Parse @FirstName LastName or @{uuid} mentions against known thread members. */
export function parseMentionsFromContent(
  content: string | undefined | null,
  members: Array<{
    userId: string;
    user: { firstName?: string | null; lastName?: string | null; email?: string | null };
  }>,
): string[] {
  if (!content?.trim() || members.length === 0) return [];

  const text = content;
  const mentioned = new Set<string>();

  for (const member of members) {
    const first = member.user.firstName?.trim() ?? '';
    const last = member.user.lastName?.trim() ?? '';
    const fullName = [first, last].filter(Boolean).join(' ').trim();
    if (fullName) {
      const pattern = new RegExp(`@${escapeRegExp(fullName)}\\b`, 'gi');
      if (pattern.test(text)) mentioned.add(member.userId);
    }
    const idPattern = new RegExp(`@\\{${escapeRegExp(member.userId)}\\}`, 'gi');
    if (idPattern.test(text)) mentioned.add(member.userId);
  }

  return [...mentioned];
}

export function mergeMentionsIntoReactions(
  reactions: unknown,
  mentionedUserIds: string[],
): Record<string, unknown> | null {
  if (mentionedUserIds.length === 0) return reactions as Record<string, unknown> | null;

  const base =
    reactions !== null && typeof reactions === 'object' && !Array.isArray(reactions)
      ? { ...(reactions as Record<string, unknown>) }
      : {};

  const existing = Array.isArray(base.mentions) ? (base.mentions as string[]) : [];
  const merged = [...new Set([...existing, ...mentionedUserIds])];
  return { ...base, mentions: merged };
}

export function readMentionUserIds(reactions: unknown): string[] {
  if (reactions === null || typeof reactions !== 'object' || Array.isArray(reactions)) return [];
  const mentions = (reactions as Record<string, unknown>).mentions;
  if (!Array.isArray(mentions)) return [];
  return mentions.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function formatMemberMentionLabel(member: {
  user: { firstName?: string | null; lastName?: string | null; email?: string | null };
}): string {
  const first = member.user.firstName?.trim() ?? '';
  const last = member.user.lastName?.trim() ?? '';
  const name = [first, last].filter(Boolean).join(' ').trim();
  return name || member.user.email?.trim() || 'Member';
}
