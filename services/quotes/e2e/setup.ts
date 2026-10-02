import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv');

process.env.NODE_ENV = process.env.NODE_ENV || 'e2e';
dotenv.config({
  path: path.resolve(__dirname, '../../../.env.e2e'),
});

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AllExceptionsFilter,
  BusinessLogicException,
  TransformResponseInterceptor,
} from '@nestlancer/common';
import {
  setupTestDatabase,
  resetTestDatabase,
  teardownTestDatabase,
  getTestPrismaClient,
} from '../../../libs/testing/src/helpers/test-database.helper';
import { QuotePdfService } from '../src/services/quote-pdf.service';
import { AppModule } from '../src/app.module';

const GLOBAL_PREFIX = 'api/v1';

let app: INestApplication | null = null;
let dbInitialized = false;

async function seedQuotesTestData(): Promise<void> {
  const prisma = getTestPrismaClient();
  if (!prisma) {
    return;
  }

  const users = [
    { id: 'quotes-e2e-client-1', email: 'quotes-e2e-client-1@example.com', role: 'USER' },
    { id: 'quotes-e2e-client-2', email: 'quotes-e2e-client-2@example.com', role: 'USER' },
    { id: 'quotes-e2e-client-3', email: 'quotes-e2e-client-3@example.com', role: 'USER' },
    { id: 'user-1', email: 'user-1@example.com', role: 'USER' },
    { id: 'admin-quotes-e2e-1', email: 'admin-quotes-e2e-1@example.com', role: 'ADMIN' },
  ];

  for (const user of users) {
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
    await seedQuotesTestData();
    dbInitialized = true;
  }

  if (app) {
    return app;
  }

  const prisma = getTestPrismaClient();

  const moduleBuilder = Test.createTestingModule({
    imports: [AppModule],
  });

  moduleBuilder.overrideProvider(QuotePdfService).useValue({
    getPdfDownloadUrl: async (userId: string, quoteId: string) => {
      if (!prisma) {
        throw new BusinessLogicException('Quote not found', 'QUOTE_001');
      }

      const quote = await prisma.quote.findFirst({
        where: { id: quoteId, userId },
        select: { id: true },
      });

      if (!quote) {
        throw new BusinessLogicException('Quote not found', 'QUOTE_001');
      }

      return {
        quoteId: quote.id,
        documentNumber: 'NL-QTE-2026-000001',
        version: 1,
        downloadUrl: `https://signed.example/quotes/${quote.id}.pdf`,
        expiresIn: 3600,
      };
    },
    generateAndStore: async (quoteId: string) => ({
      documentNumber: 'NL-QTE-2026-000001',
      versionNumber: 1,
      downloadUrl: `https://signed.example/quotes/${quoteId}.pdf`,
    }),
  });

  const moduleRef = await moduleBuilder.compile();

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
  const server = getApp().getHttpServer();
  const address = server.address() as { port: number };
  return `http://localhost:${address.port}`;
}

export function getGlobalPrefix(): string {
  return GLOBAL_PREFIX;
}
