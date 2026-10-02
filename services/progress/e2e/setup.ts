import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv');

process.env.NODE_ENV = process.env.NODE_ENV || 'e2e';
dotenv.config({
  path: path.resolve(__dirname, '../../../.env.e2e'),
});
if (process.env.DATABASE_URL) {
  process.env.DATABASE_READ_URL = process.env.DATABASE_URL;
}

import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

const GLOBAL_PREFIX = 'api/v1';

let app: INestApplication;
let dbInitialized = false;

const PROJECTS: Array<{ id: string; clientId: string; quoteId: string; requestId: string }> = [
  {
    id: 'progress-e2e-project-smoke-1',
    clientId: 'progress-e2e-client-1',
    quoteId: 'progress-e2e-quote-smoke-1',
    requestId: 'progress-e2e-request-smoke-1',
  },
  {
    id: 'progress-e2e-project-1',
    clientId: 'progress-e2e-client-1',
    quoteId: 'progress-e2e-quote-1',
    requestId: 'progress-e2e-request-1',
  },
  {
    id: 'progress-e2e-project-2',
    clientId: 'progress-e2e-client-2',
    quoteId: 'progress-e2e-quote-2',
    requestId: 'progress-e2e-request-2',
  },
  {
    id: 'progress-e2e-project-3',
    clientId: 'progress-e2e-client-3',
    quoteId: 'progress-e2e-quote-3',
    requestId: 'progress-e2e-request-3',
  },
  {
    id: 'progress-e2e-project-4',
    clientId: 'progress-e2e-client-4',
    quoteId: 'progress-e2e-quote-4',
    requestId: 'progress-e2e-request-4',
  },
  {
    id: 'progress-e2e-project-admin-1',
    clientId: 'progress-e2e-client-1',
    quoteId: 'progress-e2e-quote-admin-1',
    requestId: 'progress-e2e-request-admin-1',
  },
  {
    id: 'progress-e2e-project-admin-2',
    clientId: 'progress-e2e-client-2',
    quoteId: 'progress-e2e-quote-admin-2',
    requestId: 'progress-e2e-request-admin-2',
  },
];

async function seedProgressE2EData(): Promise<void> {
  const prisma = getTestPrismaClient();
  if (!prisma) return;

  const users = [
    { id: 'progress-e2e-client-1', email: 'progress-e2e-client-1@test.com', role: 'USER' },
    { id: 'progress-e2e-client-2', email: 'progress-e2e-client-2@test.com', role: 'USER' },
    { id: 'progress-e2e-client-3', email: 'progress-e2e-client-3@test.com', role: 'USER' },
    { id: 'progress-e2e-client-4', email: 'progress-e2e-client-4@test.com', role: 'USER' },
    { id: 'progress-e2e-admin-1', email: 'progress-e2e-admin-1@test.com', role: 'ADMIN' },
    { id: 'progress-e2e-admin-2', email: 'progress-e2e-admin-2@test.com', role: 'ADMIN' },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email,
        passwordHash: 'test-hash',
        firstName: 'Progress',
        lastName: 'E2E',
        role: user.role as any,
        status: 'ACTIVE' as any,
      },
      update: {},
    });
  }

  for (const row of PROJECTS) {
    await prisma.projectRequest.upsert({
      where: { id: row.requestId },
      create: {
        id: row.requestId,
        userId: row.clientId,
        title: `E2E Progress ${row.id}`,
        description: 'E2E progress seed',
        category: 'web',
        status: 'CONVERTED_TO_PROJECT',
      },
      update: {},
    });

    await prisma.quote.upsert({
      where: { id: row.quoteId },
      create: {
        id: row.quoteId,
        requestId: row.requestId,
        userId: row.clientId,
        title: `E2E Quote ${row.id}`,
        description: 'E2E',
        totalAmount: 10000,
        validUntil: new Date(Date.now() + 86400000 * 30),
        status: 'ACCEPTED',
      },
      update: {},
    });

    await prisma.project.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        quoteId: row.quoteId,
        clientId: row.clientId,
        title: `E2E Progress Project ${row.id}`,
        description: 'E2E progress seed project',
        status: 'IN_PROGRESS',
      },
      update: {},
    });
  }
}

export async function setupApp(): Promise<INestApplication> {
  if (!dbInitialized) {
    await setupTestDatabase();
    await resetTestDatabase();
    await seedProgressE2EData();
    dbInitialized = true;
  }

  if (app) return app;

  const moduleRef = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), AppModule],
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
    app = null as any;
  }
  if (dbInitialized) {
    await teardownTestDatabase();
    dbInitialized = false;
  }
}

export function getAppUrl(): string {
  const server = app.getHttpServer();
  const address = server.address() as { port: number };
  return `http://localhost:${address.port}`;
}

export function getGlobalPrefix(): string {
  return GLOBAL_PREFIX;
}
