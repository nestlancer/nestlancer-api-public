import { registerAs } from '@nestjs/config';

export default registerAs('portfolio', () => ({
  maxImagesPerItem: parseInt(process.env.MAX_IMAGES_PER_ITEM || '20', 10),
  maxTagsPerItem: parseInt(process.env.MAX_TAGS_PER_ITEM || '10', 10),
  publicCacheTtl: parseInt(process.env.PUBLIC_CACHE_TTL || '3600', 10),
  featuredCacheTtl: parseInt(process.env.FEATURED_CACHE_TTL || '7200', 10),
  viewDebounceHours: parseInt(process.env.VIEW_DEBOUNCE_HOURS || '1', 10),
  likeRateLimitWindowSeconds: parseInt(process.env.PORTFOLIO_LIKE_RATE_WINDOW_SECONDS || '60', 10),
  likeRateLimitMax: parseInt(process.env.PORTFOLIO_LIKE_RATE_MAX || '5', 10),
}));
