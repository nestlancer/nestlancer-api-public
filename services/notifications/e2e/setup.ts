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
import { NotificationBroadcastService } from '../src/notifications/notification-broadcast.service';

const GLOBAL_PREFIX = 'api/v1';

const E2E_USER_IDS = [
  'e2e-notifications-admin-1',
  'e2e-notifications-user-1',
  'e2e-notifications-user-auth-1',
  'e2e-notifications-user-prefs-1',
  'e2e-notifications-user-push-1',
  'e2e-notifications-user-push-device-1',
  'e2e-notifications-clear-user-1',
  'e2e-notifications-target-1',
  'e2e-notifications-target-2',
  'e2e-notifications-resend-target-1',
  'e2e-internal-trigger-1',
  'e2e-internal-caller-1',
  'e2e-user-1',
];

let app: INestApplication;
let dbInitialized = false;

async function seedNotificationE2EUsers(): Promise<void> {
  const prisma = getTestPrismaClient();
  if (!prisma) return;

  for (const id of E2E_USER_IDS) {
    const isAdmin = id === 'e2e-notifications-admin-1';
    await prisma.user.upsert({
      where: { id },
      create: {
        id,
        email: `${id}@test.com`,
        passwordHash: 'test-hash',
        firstName: 'E2E',
        lastName: 'Notifications',
        role: isAdmin ? 'ADMIN' : 'USER',
        status: 'ACTIVE',
      },
      update: {},
    });
  }
}

export async function setupApp(): Promise<INestApplication> {
  if (!dbInitialized) {
    await setupTestDatabase();
    await resetTestDatabase();
    await seedNotificationE2EUsers();
    dbInitialized = true;
  }

  if (app) return app;

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(NotificationBroadcastService)
    .useValue({
      broadcast: async (dto: { scheduledFor?: string }) => ({
        status: 'scheduled',
        accepted: true,
        scheduledFor: dto?.scheduledFor,
      }),
    })
    .compile();

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
