import { registerAs } from '@nestjs/config';

export default registerAs('messaging', () => ({
  maxMessageSize: parseInt(process.env.MAX_MESSAGE_SIZE || '10485760', 10), // 10MB
  maxAttachments: parseInt(process.env.MAX_ATTACHMENTS || '10', 10),
  redisUrl: process.env.MESSAGING_REDIS_URL || 'redis://localhost:6379',
  /** When set, clients opening “message support” always use this admin user id. */
  supportAdminUserId: process.env.SUPPORT_ADMIN_USER_ID?.trim() || undefined,
}));
