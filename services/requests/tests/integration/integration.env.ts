/**
 * Sets required env vars for requests integration tests before ConfigModule loads.
 * Must be imported first in integration spec files.
 * Uses localhost placeholders — never commit remote credentials here.
 */
import { applyIntegrationJwtEnv } from '@nestlancer/testing';

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://nl_platform_app:test_password@127.0.0.1:5432/nl_platform_test';
process.env.DATABASE_READ_URL =
  process.env.DATABASE_READ_URL ||
  'postgresql://nl_analytics_readonly:test_password@127.0.0.1:5432/nl_platform_test';
applyIntegrationJwtEnv();
