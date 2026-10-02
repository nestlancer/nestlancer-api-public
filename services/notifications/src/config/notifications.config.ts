export const NotificationsConfig = {
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:admin@nestlancer.com',
  DEFAULT_CHANNELS: ['IN_APP', 'EMAIL'],
  MAX_BROADCAST_BATCH_SIZE: 100,
  DELIVERY_RETRY_ATTEMPTS: 3,
};
