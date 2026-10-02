export type GroupMembershipSystemEvent = 'MEMBER_LEFT' | 'MEMBER_REMOVED' | 'MEMBER_JOINED';

export type GroupMembershipSystemPayload = {
  event: GroupMembershipSystemEvent;
  subjectUserId: string;
  subjectName?: string;
  actorUserId?: string;
  actorName?: string;
};

export function formatGroupMembershipSystemLabel(payload: GroupMembershipSystemPayload): string {
  const name = payload.subjectName?.trim() || 'A member';
  switch (payload.event) {
    case 'MEMBER_LEFT':
      return `${name} left the group`;
    case 'MEMBER_REMOVED':
      return `${name} was removed from the group`;
    case 'MEMBER_JOINED':
      return `${name} joined the group`;
    default:
      return 'Group update';
  }
}

/** Human-readable line stored in Message.content (never raw JSON). */
export function buildGroupMembershipSystemContent(payload: GroupMembershipSystemPayload): string {
  return formatGroupMembershipSystemLabel(payload);
}

export function buildGroupMembershipSystemMetadata(payload: GroupMembershipSystemPayload): {
  groupEvent: GroupMembershipSystemPayload;
} {
  return { groupEvent: payload };
}

export function parseGroupMembershipSystemContent(
  content: string | null | undefined,
): GroupMembershipSystemPayload | null {
  if (!content) return null;
  const trimmed = content.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(trimmed) as Partial<GroupMembershipSystemPayload>;
    if (
      parsed.event &&
      ['MEMBER_LEFT', 'MEMBER_REMOVED', 'MEMBER_JOINED'].includes(parsed.event) &&
      typeof parsed.subjectUserId === 'string'
    ) {
      return {
        event: parsed.event as GroupMembershipSystemEvent,
        subjectUserId: parsed.subjectUserId,
        subjectName: typeof parsed.subjectName === 'string' ? parsed.subjectName : undefined,
        actorUserId: typeof parsed.actorUserId === 'string' ? parsed.actorUserId : undefined,
        actorName: typeof parsed.actorName === 'string' ? parsed.actorName : undefined,
      };
    }
  } catch {}
  return null;
}

export function parseGroupMembershipSystemMetadata(
  reactions: unknown,
): GroupMembershipSystemPayload | null {
  if (!reactions || typeof reactions !== 'object') return null;
  const groupEvent = (reactions as { groupEvent?: Partial<GroupMembershipSystemPayload> })
    .groupEvent;
  if (
    groupEvent?.event &&
    ['MEMBER_LEFT', 'MEMBER_REMOVED', 'MEMBER_JOINED'].includes(groupEvent.event) &&
    typeof groupEvent.subjectUserId === 'string'
  ) {
    return {
      event: groupEvent.event as GroupMembershipSystemEvent,
      subjectUserId: groupEvent.subjectUserId,
      subjectName: typeof groupEvent.subjectName === 'string' ? groupEvent.subjectName : undefined,
      actorUserId: typeof groupEvent.actorUserId === 'string' ? groupEvent.actorUserId : undefined,
      actorName: typeof groupEvent.actorName === 'string' ? groupEvent.actorName : undefined,
    };
  }
  return null;
}
