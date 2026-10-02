import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv');

process.env.NODE_ENV = process.env.NODE_ENV || 'e2e';
dotenv.config({
  path: path.resolve(__dirname, '../../../.env.e2e'),
});

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AllExceptionsFilter,
  TransformResponseInterceptor,
  AppValidationPipe,
} from '@nestlancer/common';
import {
  setupTestDatabase,
  resetTestDatabase,
  teardownTestDatabase,
  getTestPrismaClient,
} from '../../../libs/testing/src/helpers/test-database.helper';
import { AppModule } from '../src/app.module';

// Match the effective public API shape from main.ts (global prefix "api" + URI version "v1")
const GLOBAL_PREFIX = 'api/v1';

/** Fixed IDs for E2E success paths (seeded in setup). */
export const E2E_USER_ID = 'e2e-messaging-user-1';
export const E2E_ADMIN_ID = 'e2e-messaging-admin-1';
export const E2E_PROJECT_ID = '11111111-1111-4111-a111-111111111111';

let app: INestApplication | null = null;
let dbInitialized = false;

async function seedMessagingE2EData(): Promise<void> {
  const prisma = getTestPrismaClient();
  if (!prisma) return;

  const userId = E2E_USER_ID;
  const adminId = E2E_ADMIN_ID;
  const requestId = '22222222-2222-4222-a222-222222222222';
  const quoteId = '33333333-3333-4333-a333-333333333333';
  const projectId = E2E_PROJECT_ID;

  await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email: 'e2e-messaging@example.com',
      passwordHash: 'test-hash',
      firstName: 'E2E',
      lastName: 'Messaging',
      role: 'USER',
      status: 'ACTIVE',
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { id: adminId },
    create: {
      id: adminId,
      email: 'e2e-messaging-admin@example.com',
      passwordHash: 'test-hash',
      firstName: 'E2E',
      lastName: 'Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    update: {},
  });

  await prisma.projectRequest.upsert({
    where: { id: requestId },
    create: {
      id: requestId,
      userId,
      title: 'E2E Messaging Request',
      description: 'For messaging E2E',
      category: 'WEB_DEVELOPMENT',
      requirements: [],
      status: 'SUBMITTED',
    },
    update: {},
  });

  await prisma.quote.upsert({
    where: { id: quoteId },
    create: {
      id: quoteId,
      requestId,
      userId,
      title: 'E2E Quote',
      description: 'E2E',
      totalAmount: 10000,
      validUntil: new Date(Date.now() + 86400000),
      status: 'ACCEPTED',
    },
    update: {},
  });

  await prisma.project.upsert({
    where: { id: projectId },
    create: {
      id: projectId,
      quoteId,
      clientId: userId,
      adminId,
      title: 'E2E Messaging Project',
      description: 'E2E',
      status: 'IN_PROGRESS',
    },
    update: {},
  });
}

export async function setupApp(): Promise<INestApplication> {
  if (!dbInitialized) {
    await setupTestDatabase();
    await resetTestDatabase();
    await seedMessagingE2EData();
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
  app.useGlobalPipes(new AppValidationPipe());
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
  const server = getApp().getHttpServer();
  const address = server.address() as { port: number };
  return `http://localhost:${address.port}`;
}

export function getGlobalPrefix(): string {
  return GLOBAL_PREFIX;
}
