/**
 * Sets required env vars for portfolio integration tests before ConfigModule loads.
 * Must be imported first in integration spec files.
 */
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/testdb';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-secret-32-chars-minimum!!';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-32-chars!!';
process.env.CACHE_HOST = process.env.CACHE_HOST || 'localhost';
process.env.CACHE_PORT = process.env.CACHE_PORT || '6379';
process.env.SEARCH_URL = process.env.SEARCH_URL || 'http://localhost:7700';
