export class ImpersonationSession {
  id: string;
  adminId: string;
  targetUserId: string;
  reason: string;
  ticketId?: string | null;
  startedAt: Date;
  endedAt?: Date | null;
  ipAddress?: string | null;
}
