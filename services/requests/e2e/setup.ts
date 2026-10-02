import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AllExceptionsFilter, TransformResponseInterceptor } from '@nestlancer/common';
import {
  setupTestDatabase,
  resetTestDatabase,
  teardownTestDatabase,
  getTestPrismaClient,
} from '../../../libs/testing/src/helpers/test-database.helper';

import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv');

process.env.NODE_ENV = process.env.NODE_ENV || 'e2e';
dotenv.config({
  path: path.resolve(__dirname, '../../../.env.e2e'),
});

// Lazily require AppModule after env has been loaded so that
// config validation sees the populated environment.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AppModule } = require('../src/app.module');

const GLOBAL_PREFIX = 'api/v1';

let app: INestApplication | null = null;
let dbInitialized = false;

async function seedRequestsTestData(): Promise<void> {
  const prisma = getTestPrismaClient();
  if (!prisma) {
    return;
  }

  const users = [
    { id: 'e2e-client-request-1', email: 'e2e-client-request-1@example.com', role: 'USER' },
    { id: 'e2e-client-list-1', email: 'e2e-client-list-1@example.com', role: 'USER' },
    { id: 'e2e-client-crud-1', email: 'e2e-client-crud-1@example.com', role: 'USER' },
    { id: 'e2e-client-quotes-1', email: 'e2e-client-quotes-1@example.com', role: 'USER' },
    {
      id: 'e2e-client-attachments-delete-1',
      email: 'e2e-client-attachments-delete-1@example.com',
      role: 'USER',
    },
    { id: 'e2e-client-delete-1', email: 'e2e-client-delete-1@example.com', role: 'USER' },
    { id: 'e2e-admin-flow-1', email: 'e2e-admin-flow-1@example.com', role: 'USER' },
    { id: 'normal-user', email: 'normal-user@example.com', role: 'USER' },
    { id: 'admin-e2e-1', email: 'admin-e2e-1@example.com', role: 'ADMIN' },
    { id: 'admin-assignee-e2e-1', email: 'admin-assignee-e2e-1@example.com', role: 'ADMIN' },
  ];

  for (const user of users) {
    // Minimal deterministic users for E2E scenarios
    await prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email,
        passwordHash: 'test-hash',
        firstName: 'E2E',
        lastName: 'User',
        role: user.role as any,
        status: 'ACTIVE' as any,
      },
      update: {},
    });
  }
}

export async function setupApp(): Promise<INestApplication> {
  if (!dbInitialized) {
    await setupTestDatabase();
    await resetTestDatabase();
    await seedRequestsTestData();
    dbInitialized = true;
  }

  if (app) {
    return app;
  }

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication();
  app.setGlobalPrefix(GLOBAL_PREFIX);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new TransformResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  await app.listen(0);
  return app;
}

export async function teardownApp(): Promise<void> {
  if (app) {
    await app.close();
    app = null;
  }

  if (dbInitialized) {
    await teardownTestDatabase();
    dbInitialized = false;
  }
}

export function getApp(): INestApplication {
  if (!app) {
    throw new Error('App has not been initialized. Call setupApp() first.');
  }
  return app;
}

export function getAppUrl(): string {
  if (!app) {
    throw new Error('App has not been initialized. Call setupApp() first.');
  }
  const server = app.getHttpServer();
  const address = server.address() as { port: number };
  return `http://localhost:${address.port}`;
}

export function getGlobalPrefix(): string {
  return GLOBAL_PREFIX;
}
