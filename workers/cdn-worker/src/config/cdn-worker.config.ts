import { registerAs } from '@nestjs/config';

function isCloudflareConfigured(): boolean {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN ?? '';
  const zoneId = process.env.CLOUDFLARE_ZONE_ID ?? '';

  if (!apiToken || !zoneId) {
    return false;
  }

  return !/placeholder|change_me/i.test(apiToken) && !/placeholder|change_me/i.test(zoneId);
}

export default registerAs('cdn', () => ({
  batchWindowMs: parseInt(process.env.BATCH_WINDOW_MS || '', 10) || 10000,
  maxBatchSize: parseInt(process.env.MAX_BATCH_SIZE || '', 10) || 30,
  retryOnRateLimit: process.env.RETRY_ON_RATE_LIMIT === 'true',
  skipInvalidation: process.env.CDN_SKIP_INVALIDATION === 'true' || !isCloudflareConfigured(),
  cloudflare: {
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
    zoneId: process.env.CLOUDFLARE_ZONE_ID,
  },
}));
