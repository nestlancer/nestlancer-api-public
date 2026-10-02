export enum NotificationChannel {
  IN_APP = 'IN_APP',
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
}

export enum NotificationJobType {
  IN_APP = 'IN_APP',
  PUSH = 'PUSH',
  REALTIME_FANOUT = 'REALTIME_FANOUT',
  BROADCAST_BATCH = 'BROADCAST_BATCH',
}

export interface NotificationJob {
  type: NotificationJobType;
  userId: string;
  /** Canonical in-app type stored on Notification rows (e.g. quote.received). */
  notificationType?: string;
  channels?: NotificationChannel[];
  notification: {
    title: string;
    message: string;
    data?: Record<string, any>;
    actionUrl?: string;
  };
  priority?: string;
  retryCount?: number;
  /** Prevents duplicate rows when outbox events are replayed. */
  idempotencyKey?: string;
}
