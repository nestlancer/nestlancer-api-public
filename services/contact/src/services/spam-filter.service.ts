import { Injectable } from '@nestjs/common';

import { contactConfig } from '../config/contact.config';
import { SpamCheckResult } from '../interfaces/contact.interface';

@Injectable()
export class SpamFilterService {
  checkSpam(email: string, message: string): SpamCheckResult {
    let score = 0;
    const reasons: string[] = [];

    const emailDomain = email.split('@')[1]?.toLowerCase() || '';
    if (contactConfig.SPAM_EMAIL_DOMAINS.includes(emailDomain)) {
      score += 0.3;
      reasons.push('Known disposable email domain');
    }

    const urlMatches = message.match(/https?:\/\/[^\s]+/g);
    if (urlMatches && urlMatches.length > 2) {
      score += 0.2 * urlMatches.length;
      reasons.push(`Too many links (${urlMatches.length})`);
    }

    const messageLength = message.length || 1;
    let upperCaseCount = 0;
    for (const char of message) {
      if (char >= 'A' && char <= 'Z') upperCaseCount++;
    }
    if (messageLength > 20 && upperCaseCount / messageLength > 0.5) {
      score += 0.1;
      reasons.push('Excessive uppercase characters');
    }

    const lowerMessage = message.toLowerCase();
    for (const keyword of contactConfig.SPAM_KEYWORDS) {
      if (lowerMessage.includes(keyword)) {
        score += 0.2;
        reasons.push(`Spam keyword detected: ${keyword}`);
      }
    }

    const finalScore = Math.min(score, 1.0);
    return {
      score: finalScore,
      reasons,
      isSpam: finalScore >= contactConfig.SPAM_SCORE_THRESHOLD,
    };
  }
}
