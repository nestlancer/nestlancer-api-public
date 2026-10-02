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
import { MediaStorageService } from '../src/storage/storage.service';

const GLOBAL_PREFIX = 'api/v1';

/** Fixed IDs for E2E success paths (seeded in setup). */
export const E2E_USER_ID = 'e2e-media-user-1';
export const E2E_ADMIN_ID = 'e2e-media-admin-1';

let app: INestApplication | null = null;
let dbInitialized = false;

const mockMediaStorageService = {
  generateStorageKey: (userId: string, filename: string) =>
    `e2e/${userId}/${Date.now()}-${filename}`,
  generatePresignedUploadUrl: () => Promise.resolve('https://e2e-presigned.example/upload'),
  generatePresignedDownloadUrl: () => Promise.resolve('https://e2e-presigned.example/download'),
  upload: () =>
    Promise.resolve({ key: 'e2e-key', url: 'https://e2e.example/file', etag: 'e2e-etag' }),
  deleteFile: () => Promise.resolve(),
  getFileSize: () => Promise.resolve(0),
} as unknown as MediaStorageService;

async function seedMediaE2EData(): Promise<void> {
  const prisma = getTestPrismaClient();
  if (!prisma) return;

  await prisma.user.upsert({
    where: { id: E2E_USER_ID },
    create: {
      id: E2E_USER_ID,
      email: 'e2e-media-user@example.com',
      passwordHash: 'test-hash',
      firstName: 'E2E',
      lastName: 'MediaUser',
      role: 'USER',
      status: 'ACTIVE',
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { id: E2E_ADMIN_ID },
    create: {
      id: E2E_ADMIN_ID,
      email: 'e2e-media-admin@example.com',
      passwordHash: 'test-hash',
      firstName: 'E2E',
      lastName: 'MediaAdmin',
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
    await seedMediaE2EData();
    dbInitialized = true;
  }

  if (app) {
    return app;
  }

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(MediaStorageService)
    .useValue(mockMediaStorageService)
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
