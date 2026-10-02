/**
 * E2E setup: bootstraps the Admin service app (NestJS AppModule, in-process).
 * Loads .env.e2e so DATABASE_URL, JWT_ACCESS_SECRET, cache/queue URLs are available.
 * Overrides queue providers so tests do not require real RabbitMQ.
 * E2E expects DATABASE_URL and Redis (cache) to be reachable per .env.e2e (e.g. local or CI infra).
 * Use getGlobalPrefix() in tests for all URLs so they match the app (main.ts uses API_PREFIX).
 */
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv');

// Load .env.e2e first so DATABASE_URL, JWT_ACCESS_SECRET, cache/queue URLs are available.
// NODE_ENV=test so app config schema validates (development|production|test|staging); schema does not include 'e2e'.
process.env.NODE_ENV = 'test';
dotenv.config({
  path: path.resolve(__dirname, '../../../.env.e2e'),
});

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { API_PREFIX } from '@nestlancer/common';
import {
  AllExceptionsFilter,
  HttpExceptionFilter,
  TransformResponseInterceptor,
} from '@nestlancer/common';
import { QueuePublisherService, QueueConsumerService } from '@nestlancer/queue';
import { PrismaWriteService } from '@nestlancer/database';
import { CacheManagementService } from '../src/services/cache-management.service';
import { AppModule } from '../src/app.module';

const GLOBAL_PREFIX = API_PREFIX;

let app: INestApplication | null = null;

export async function setupApp(): Promise<INestApplication> {
  if (app) {
    return app;
  }

  const moduleRef = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), AppModule],
  })
    .overrideProvider(QueuePublisherService)
    .useValue({
      publish: jest.fn().mockResolvedValue(undefined),
      sendToQueue: jest.fn().mockResolvedValue(undefined),
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
    })
    .overrideProvider(QueueConsumerService)
    .useValue({
      consume: jest.fn().mockResolvedValue(undefined),
      getChannel: jest.fn(),
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
    })
    .overrideProvider(CacheManagementService)
    .useValue({
      clearCache: jest.fn().mockResolvedValue({ message: 'All caches cleared successfully' }),
    })
    .compile();

  app = moduleRef.createNestApplication();
  app.setGlobalPrefix(GLOBAL_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(new TransformResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());
  await app.init();

  // Ensure E2E admin user exists so SystemConfig.updatedBy FK resolves.
  const testPasswordHash = '$2b$12$LJ3m4ys3Gz8m.O1lHUkJQeT6bJxHlqJ5kKDqQ1p7rF4YJx8vXxJzS';
  const prisma = moduleRef.get(PrismaWriteService);
  await prisma.user.upsert({
    where: { id: 'test-admin-001' },
    update: {},
    create: {
      id: 'test-admin-001',
      email: 'admin@nestlancer.com',
      passwordHash: testPasswordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  await app.listen(0);
  return app;
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
