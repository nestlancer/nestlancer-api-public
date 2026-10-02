import { NotificationChannel, NotificationJob, NotificationJobType } from '@nestlancer/common';

/** Returns true when the payload is already a normalized NotificationJob. */
export function isNotificationJob(raw: unknown): raw is NotificationJob {
  if (!raw || typeof raw !== 'object') return false;
  const job = raw as Record<string, unknown>;
  const notification = job.notification;
  if (!notification || typeof notification !== 'object') return false;
  const content = notification as Record<string, unknown>;
  return (
    typeof job.userId === 'string' &&
    job.userId.length > 0 &&
    Object.values(NotificationJobType).includes(job.type as NotificationJobType) &&
    typeof content.title === 'string' &&
    content.title.length > 0 &&
    typeof content.message === 'string' &&
    content.message.length > 0
  );
}

export function defaultInAppChannels(): NotificationChannel[] {
  return [NotificationChannel.IN_APP];
}
