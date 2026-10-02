/**
 * Project statuses where participants may send and receive project chat
 * (conversation appears in inbox for active collaboration).
 */
export const PROJECT_STATUSES_ALLOWING_MESSAGING = [
  'PENDING_PAYMENT',
  'IN_PROGRESS',
  'REVIEW',
  'REVISION_REQUESTED',
  'ON_HOLD',
  'COMPLETED',
] as const;

export type ProjectStatusAllowingMessaging = (typeof PROJECT_STATUSES_ALLOWING_MESSAGING)[number];

export function doesProjectStatusAllowMessaging(status: string): boolean {
  return (PROJECT_STATUSES_ALLOWING_MESSAGING as readonly string[]).includes(status);
}
