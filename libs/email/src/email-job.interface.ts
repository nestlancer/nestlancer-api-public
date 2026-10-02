export enum EmailJobType {
  VERIFICATION = 'EMAIL_VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
  WELCOME = 'WELCOME',
  NOTIFICATION = 'NOTIFICATION',
  QUOTE_SENT = 'QUOTE_SENT',
  QUOTE_ACCEPTED = 'QUOTE_ACCEPTED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_REFUND = 'PAYMENT_REFUND',
  PROJECT_UPDATE = 'PROJECT_UPDATE',
  PROJECT_COMPLETED = 'PROJECT_COMPLETED',
  CONTACT_RESPONSE = 'CONTACT_RESPONSE',
  CONTACT_RECEIVED = 'CONTACT_RECEIVED',
  CONTACT_INQUIRY = 'CONTACT_INQUIRY',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
}

export type EmailSenderProfile = 'default' | 'billing' | 'support';

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  encoding?: string;
  path?: string;
  cid?: string;
}

export interface EmailJob {
  type: EmailJobType | string;
  to: string;
  data: Record<string, unknown>;
  attachments?: EmailAttachment[];
  priority?: number;
  senderProfile?: EmailSenderProfile;
  replyTo?: string;
}

export function isEmailJob(payload: unknown): payload is EmailJob {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  return typeof p.type === 'string' && typeof p.to === 'string' && p.data !== undefined;
}
