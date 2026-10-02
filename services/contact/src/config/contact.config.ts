import { parseEnvPositiveInt } from '@nestlancer/common';

/**
 * Contact form limits — all knobs env-driven (Infisical-safe quote parsing).
 * Master switch: RATE_LIMIT_ENABLED (checked at call site).
 */
export const contactConfig = {
  get RATE_LIMIT_PER_IP(): number {
    return parseEnvPositiveInt(process.env.CONTACT_RATE_LIMIT_PER_IP, 3);
  },
  get RATE_LIMIT_TTL_HOURS(): number {
    return parseEnvPositiveInt(process.env.CONTACT_RATE_LIMIT_TTL_HOURS, 1);
  },
  SPAM_SCORE_THRESHOLD: 0.7,
  SPAM_EMAIL_DOMAINS: [
    'test.com',
    'example.com',
    'mailinator.com',
    'guerrillamail.com',
    'tempmail.com',
  ],
  SPAM_KEYWORDS: [
    'buy followers',
    'cheap meds',
    'viagra',
    'crypto investment',
    'lottery winner',
    'SEO services',
  ],
  MAX_MESSAGE_LENGTH: 5000,
};
