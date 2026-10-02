/**
 * Sets required env vars for gateway integration tests before ConfigModule loads.
 * Must be imported first in integration spec files.
 */
import { applyIntegrationJwtEnv } from '@nestlancer/testing';

process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/testdb';
applyIntegrationJwtEnv();
