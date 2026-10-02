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

const GLOBAL_PREFIX = 'api/v1';

export const SEEDED_USER_ID = 'e2e-user-1';
export const SEEDED_ADMIN_ID = 'e2e-admin-1';

let app: INestApplication | undefined;
let dbInitialized = false;

async function seedPortfolioE2EData(): Promise<void> {
  const prisma = getTestPrismaClient();
  if (!prisma) return;

  await prisma.user.upsert({
    where: { id: SEEDED_USER_ID },
    create: {
      id: SEEDED_USER_ID,
      email: 'e2e-portfolio-user@example.com',
      passwordHash: 'test-hash',
      firstName: 'E2E',
      lastName: 'PortfolioUser',
      role: 'USER',
      status: 'ACTIVE',
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { id: SEEDED_ADMIN_ID },
    create: {
      id: SEEDED_ADMIN_ID,
      email: 'e2e-portfolio-admin@example.com',
      passwordHash: 'test-hash',
      firstName: 'E2E',
      lastName: 'PortfolioAdmin',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    update: {},
  });
}

export async function setupApp(): Promise<INestApplication> {
  if (!dbInitialized) {
    await setupTestDatabase();
    await resetTestDatabase();
    await seedPortfolioE2EData();
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
    app = undefined;
  }

  await teardownTestDatabase();
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
