import { ContactMessage } from '../entities/contact-message.entity';
import { ContactResponseLog } from '../entities/contact-response-log.entity';

export interface SpamCheckResult {
  score: number;
  reasons: string[];
  isSpam: boolean;
}

export interface ContactWithResponses extends ContactMessage {
  responses: ContactResponseLog[];
}
