/**
 * E2E setup: bootstraps the Gateway app and exposes URL for HTTP calls.
 * Must be imported first so env is set before AppModule loads.
 * Loads .env.e2e from repo root and sets NODE_ENV/cwd so libs/config loadEnvConfig finds it.
 */
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv');

// Force e2e so libs/config loadEnvConfig() resolves .env.e2e (Jest sets NODE_ENV=test otherwise)
process.env.NODE_ENV = 'e2e';

// Load .env.e2e into process.env for any code that reads it directly
const e2eEnvPath = path.resolve(__dirname, '../../.env.e2e');
dotenv.config({ path: e2eEnvPath });

// Chdir to repo root so libs/config loadEnvConfig finds .env.e2e
const repoRoot = path.resolve(__dirname, '../..');
const previousCwd = process.cwd();
if (previousCwd !== repoRoot && !path.relative(repoRoot, previousCwd).startsWith('..')) {
  process.chdir(repoRoot);
}

// Lazy require so AppModule loads after env and cwd are set (imports are hoisted)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AppModule } = require('../src/app.module');

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import {
  AppValidationPipe,
  AllExceptionsFilter,
  TransformResponseInterceptor,
  API_PREFIX,
  API_VERSION,
} from '@nestlancer/common';

let app: INestApplication;

function decodeTokenRole(authHeader: string | undefined): string | undefined {
  if (!authHeader?.startsWith('Bearer ')) return undefined;
  try {
    const token = authHeader.slice(7);
    const parts = token.split('.');
    if (parts.length !== 3) return undefined;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    return payload?.role;
  } catch {
    return undefined;
  }
}

function mockHttpService() {
  return {
    request: jest
      .fn()
      .mockImplementation((config: { url?: string; headers?: Record<string, string> }) => {
        const targetUrl = config.url || '';
        const auth = (config.headers?.Authorization || config.headers?.authorization) as
          | string
          | undefined;
        const isProtected =
          targetUrl.includes('users-service') ||
          targetUrl.includes('admin-service') ||
          targetUrl.includes('projects-service') ||
          /\/profile(?:\/|$)/.test(targetUrl) ||
          /\/admin(?:\/|$)/.test(targetUrl);
        const isAdmin = targetUrl.includes('admin-service') || /\/admin(?:\/|$)/.test(targetUrl);
        const hasValidAuth =
          auth?.startsWith('Bearer ') && auth.length > 50 && !auth.includes('invalid-token');
        const role = decodeTokenRole(auth);
        if (isProtected && !auth) {
          return throwError(() =>
            Object.assign(new Error('Unauthorized'), {
              response: { status: 401, data: { message: 'Unauthorized' } },
            }),
          );
        }
        if (isProtected && auth && !hasValidAuth) {
          return throwError(() =>
            Object.assign(new Error('Unauthorized'), {
              response: { status: 401, data: { message: 'Unauthorized' } },
            }),
          );
        }
        if (isAdmin && hasValidAuth && role !== 'ADMIN') {
          return throwError(() =>
            Object.assign(new Error('Forbidden'), {
              response: { status: 403, data: { message: 'Forbidden' } },
            }),
          );
        }
        if (config.url?.includes('/health') || config.url?.includes('/auth/')) {
          return of({ data: { status: 'ok' }, status: 200, headers: {} });
        }
        return of({ data: { status: 'ok' }, status: 200, headers: {} });
      }),
    get: jest.fn().mockReturnValue(of({ data: { status: 'ok' }, status: 200, headers: {} })),
  };
}

export async function setupApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(HttpService)
    .useValue(mockHttpService())
    .compile();

  app = moduleRef.createNestApplication();
  app.setGlobalPrefix(`${API_PREFIX}/${API_VERSION}`);
  app.useGlobalPipes(new AppValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformResponseInterceptor());
  await app.init();
  await app.listen(0);
  return app;
}

export async function teardownApp(): Promise<void> {
  await app?.close();
}

export function getApp(): INestApplication {
  if (!app) {
    throw new Error('App has not been initialized. Call setupApp() first.');
  }
  return app;
}

export function getAppUrl(): string {
  const server = app.getHttpServer();
  const address = server.address() as { port: number };
  return `http://localhost:${address.port}`;
}

/** Global URL path prefix without leading slash (e.g. "api/v1") for use in request paths. */
export function getGlobalPrefix(): string {
  return `${API_PREFIX}/${API_VERSION}`;
}

/** Base path with leading slash (e.g. "/api/v1") for URL construction. */
export function getBasePath(): string {
  return `/${getGlobalPrefix()}`;
}
