import { registerAs } from '@nestjs/config';

export default registerAs('usersService', () => ({
  avatar: {
    maxSize: parseInt(process.env.AVATAR_MAX_SIZE || '5242880', 10), // 5MB limit
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    s3Bucket: process.env.STORAGE_BUCKET_AVATARS || 'nestlancer-avatars',
  },
  gdpr: {
    dataExportLimitDays: parseInt(process.env.GDPR_EXPORT_LIMIT_DAYS || '30', 10),
    softDeleteGracePeriodDays: parseInt(process.env.SOFT_DELETE_GRACE_PERIOD_DAYS || '30', 10),
  },
}));
