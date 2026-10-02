import { registerAs } from '@nestjs/config';

export default registerAs('blog', () => ({
  postsPerPage: parseInt(process.env.POSTS_PER_PAGE || '10', 10),
  maxCommentLength: parseInt(process.env.MAX_COMMENT_LENGTH || '2000', 10),
  commentEditWindowMinutes: parseInt(process.env.COMMENT_EDIT_WINDOW_MINUTES || '30', 10),
  maxCommentDepth: parseInt(process.env.MAX_COMMENT_DEPTH || '3', 10),
  maxRevisionsPerPost: parseInt(process.env.MAX_REVISIONS_PER_POST || '50', 10),
  readingWpm: parseInt(process.env.READING_WPM || '200', 10),
  rssItemsCount: parseInt(process.env.RSS_ITEMS_COUNT || '20', 10),
  viewDebounceHours: parseInt(process.env.VIEW_DEBOUNCE_HOURS || '1', 10),
  spamScoreThreshold: parseFloat(process.env.SPAM_SCORE_THRESHOLD || '0.7'),
  presignedUrlExpiry: parseInt(process.env.BLOG_PRESIGNED_URL_EXPIRY || '3600', 10),
}));
