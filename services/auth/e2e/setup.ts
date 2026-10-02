/**
 * E2E setup: bootstraps the Auth service app and exposes URL for HTTP calls.
 * Must be imported first so env is set before AppModule loads.
 *
 * This uses the root-level `.env.e2e` so that all shared E2E
 * infrastructure (Postgres/Redis/RabbitMQ/etc.) is consistent.
 */
import * as path from 'path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AllExceptionsFilter, TransformResponseInterceptor } from '@nestlancer/common';

// Ensure we are in the E2E environment and load `.env.e2e`
// so core variables like DATABASE_URL / JWT_* are available.
// Use `require` to avoid TypeScript type dependency on dotenv and
// `require`-load the AppModule afterwards so config sees populated env.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv');

process.env.NODE_ENV = process.env.NODE_ENV || 'e2e';
dotenv.config({
  path: path.resolve(__dirname, '../../../.env.e2e'),
});

// Lazily require AppModule after env has been loaded so that
// NestlancerConfigModule.forRoot() runs with the correct environment.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AppModule } = require('../src/app.module');

const GLOBAL_PREFIX = 'api/v1/auth';

let app: INestApplication | null = null;

export async function setupApp(): Promise<INestApplication> {
  if (app) {
    return app;
  }

  try {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(GLOBAL_PREFIX);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new TransformResponseInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    // Listen on an ephemeral port so tests can optionally use getAppUrl()
    await app.listen(0);
    return app;
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('AUTH E2E setupApp error:', err, err?.errors);
    throw err;
  }
}

export async function teardownApp(): Promise<void> {
  if (app) {
    await app.close();
    app = null;
  }
}

export function getApp(): INestApplication {
  if (!app) {
    throw new Error('App has not been initialized. Call setupApp() first.');
  }
  return app;
}

export function getGlobalPrefix(): string {
  return GLOBAL_PREFIX;
}

export function getAppUrl(): string {
  if (!app) {
    throw new Error('App has not been initialized. Call setupApp() first.');
  }
  const server = app.getHttpServer();
  const address = server.address() as { port: number };
  return `http://localhost:${address.port}`;
}
