export interface MailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  attachments?: MailAttachment[];
}
export interface MailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}
