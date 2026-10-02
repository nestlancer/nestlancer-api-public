export interface NotificationEventType {
  QUOTE_RECEIVED: 'quote.received';
  QUOTE_ACCEPTED: 'quote.accepted';
  PAYMENT_COMPLETED: 'payment.completed';
  PAYMENT_FAILED: 'payment.failed';
  MILESTONE_COMPLETED: 'milestone.completed';
  MESSAGE_RECEIVED: 'message.received';
  PROJECT_STATUS_CHANGED: 'project.statusChanged';
  SYSTEM_ANNOUNCEMENT: 'system.announcement';
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
}

export enum NotificationCategory {
  AUTH = 'AUTH',
  PROJECT = 'PROJECT',
  PAYMENT = 'PAYMENT',
  MESSAGE = 'MESSAGE',
  SYSTEM = 'SYSTEM',
  ADMIN = 'ADMIN',
}

import { NotificationChannel } from '@nestlancer/common';

export { NotificationChannel };
