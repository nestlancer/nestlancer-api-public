export class Announcement {
  id: string;
  title: string;
  message: string;
  channels: string[];
  type?: 'INFO' | 'WARNING' | 'CRITICAL';
  dismissable?: boolean;
  scheduledFor?: Date | null;
  sentAt?: Date | null;
  expiresAt?: Date | null;
  createdBy: string;
  createdAt: Date;
}
