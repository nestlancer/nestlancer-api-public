import { registerAs } from '@nestjs/config';

export default registerAs('analytics-worker', () => ({
  hourlyCron: process.env.HOURLY_CRON || '0 * * * *',
  dailyCron: process.env.DAILY_CRON || '0 2 * * *',
  weeklyCron: process.env.WEEKLY_CRON || '0 3 * * 1',
  cacheTtlHourly: parseInt(process.env.CACHE_TTL_HOURLY || '3600', 10),
  cacheTtlDaily: parseInt(process.env.CACHE_TTL_DAILY || '86400', 10),
  useReadReplica: process.env.USE_READ_REPLICA === 'true',
  reportS3Bucket: process.env.STORAGE_BUCKET_REPORTS || 'nestlancer-reports',
}));
