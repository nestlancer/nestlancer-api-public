/**
 * Sets required env vars for admin integration tests before ConfigModule loads.
 * Must be imported first in integration spec files.
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/testdb';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-secret-32-chars-minimum!!';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-32-chars!!';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.REDIS_CACHE_URL = process.env.REDIS_CACHE_URL || 'redis://localhost:6379';
process.env.RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
