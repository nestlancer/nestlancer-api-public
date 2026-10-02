import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv');

process.env.NODE_ENV = process.env.NODE_ENV || 'e2e';
dotenv.config({
  path: path.resolve(__dirname, '../../../.env.e2e'),
});

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AllExceptionsFilter, TransformResponseInterceptor } from '@nestlancer/common';
import {
  setupTestDatabase,
  resetTestDatabase,
  teardownTestDatabase,
  getTestPrismaClient,
  testMigrationsReady,
} from '../../../libs/testing/src/helpers/test-database.helper';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';

const GLOBAL_PREFIX = 'api/v1';
/** Known password for e2e-user-1 (used in force-password-reset-flow e2e). */
export const E2E_USER_PASSWORD = 'E2ePass123!';

let app: INestApplication;
let dbInitialized = false;

async function seedUsersTestData(): Promise<void> {
  const prisma = getTestPrismaClient();
  if (!prisma) {
    return;
  }

  const passwordHash = await bcrypt.hash(E2E_USER_PASSWORD, 10);

  // Deterministic test users used in E2E tests
  await prisma.user.upsert({
    where: { id: 'e2e-user-1' },
    create: {
      id: 'e2e-user-1',
      email: 'e2e-user-1@example.com',
      passwordHash,
      firstName: 'E2E',
      lastName: 'User',
      role: 'USER',
      status: 'ACTIVE',
      emailVerified: true,
    },
    update: { passwordHash, emailVerified: true },
  });

  await prisma.authConfig.upsert({
    where: { userId: 'e2e-user-1' },
    create: { userId: 'e2e-user-1' },
    update: {},
  });
  await prisma.$executeRaw`
    UPDATE "AuthConfig" SET "mustChangePassword" = false WHERE "userId" = ${'e2e-user-1'}
  `;

  await prisma.user.upsert({
    where: { id: 'e2e-admin-1' },
    create: {
      id: 'e2e-admin-1',
      email: 'e2e-admin-1@example.com',
      passwordHash,
      firstName: 'E2E',
      lastName: 'Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
    },
    update: { passwordHash, emailVerified: true },
  });
}

export async function setupApp(): Promise<INestApplication> {
  if (!dbInitialized) {
    await setupTestDatabase();
    if (testMigrationsReady()) {
      await resetTestDatabase();
      await seedUsersTestData();
    } else {
      console.warn(
        '[users-e2e] Skipping seed: migrations were not applied (check DATABASE_URL permissions).',
      );
    }
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
    app = undefined as unknown as INestApplication;
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
