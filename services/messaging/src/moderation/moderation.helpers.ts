import { Prisma, type MessageType } from '@prisma/client';

/** Shown in chat after an operator removes a flagged message. */
export const MODERATION_REMOVED_NOTICE =
  'This flagged message was removed by moderation.';

export type ModerationReactions = Record<string, unknown>;

export function readReactions(raw: unknown): ModerationReactions {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? { ...(raw as ModerationReactions) }
    : {};
}

export function isModerationRemoved(reactions: ModerationReactions): boolean {
  return reactions.moderationRemoved === true;
}

export function isModerationEscalated(reactions: ModerationReactions): boolean {
  return reactions.escalated === true || reactions.moderationCensored === true;
}

type Tx = {
  messageModerationEvent: {
    create: (args: {
      data: {
        messageId: string;
        action: 'FLAGGED' | 'DISMISSED' | 'ESCALATED' | 'REMOVED' | 'RESTORED';
        actorId?: string | null;
        originalContent?: string | null;
        originalType?: MessageType | null;
        restoredContent?: string | null;
        note?: string | null;
        metadata?: Prisma.InputJsonValue;
      };
    }) => Promise<unknown>;
  };
};

export async function recordModerationEvent(
  tx: Tx,
  input: {
    messageId: string;
    action: 'FLAGGED' | 'DISMISSED' | 'ESCALATED' | 'REMOVED' | 'RESTORED';
    actorId?: string | null;
    originalContent?: string | null;
    originalType?: MessageType | null;
    restoredContent?: string | null;
    note?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  await tx.messageModerationEvent.create({
    data: {
      messageId: input.messageId,
      action: input.action,
      actorId: input.actorId ?? null,
      originalContent: input.originalContent ?? null,
      originalType: input.originalType ?? null,
      restoredContent: input.restoredContent ?? null,
      note: input.note ?? null,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}
