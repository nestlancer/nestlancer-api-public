import { registerAs } from '@nestjs/config';

import { REQUEST_ATTACHMENT_MIME_TYPES } from '@nestlancer/common';

export default registerAs('requestsService', () => ({
  attachments: {
    maxSize: parseInt(process.env.ATTACHMENT_MAX_SIZE || '10485760', 10), // 10MB limit
    maxCount: parseInt(process.env.ATTACHMENT_MAX_COUNT || '10', 10),
    allowedMimeTypes: [...REQUEST_ATTACHMENT_MIME_TYPES],
    s3Bucket: process.env.STORAGE_BUCKET_ATTACHMENTS || 'nestlancer-requests',
  },
  quotes: {
    defaultExpirationDays: parseInt(process.env.QUOTE_EXPIRATION_DAYS || '14', 10),
  },
}));
