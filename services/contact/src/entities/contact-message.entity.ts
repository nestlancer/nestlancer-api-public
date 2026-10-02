import { ContactStatus, ContactSubject } from '@nestlancer/common';

export class ContactMessage {
  id: string;
  ticketId: string;
  name: string;
  email: string;
  subject: ContactSubject;
  message: string;
  status: ContactStatus;
  spamScore?: number;
  ipAddress?: string; // Hashed string / json representation
  ipInfo?: any;
  turnstileVerified?: boolean;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
