import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv');

process.env.NODE_ENV = process.env.NODE_ENV || 'e2e';
dotenv.config({
  path: path.resolve(__dirname, '../../../.env.e2e'),
});

import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AllExceptionsFilter, TransformResponseInterceptor } from '@nestlancer/common';
import {
  setupTestDatabase,
  resetTestDatabase,
  teardownTestDatabase,
  getTestPrismaClient,
} from '../../../libs/testing/src/helpers/test-database.helper';
import { AppModule } from '../src/app.module';

// Match effective public API shape from main.ts (global prefix "api" + URI version "v1")
const GLOBAL_PREFIX = 'api/v1';

/** Fixed IDs for E2E success paths (seeded in setup). */
export const BLOG_E2E_USER_ID = 'e2e-blog-user-1';
export const BLOG_E2E_ADMIN_ID = 'e2e-blog-admin-1';
export const BLOG_E2E_POST_ID = '11111111-aaaa-4111-a111-111111111111';
export const BLOG_E2E_POST_SLUG = 'e2e-blog-post';
export const BLOG_E2E_CATEGORY_ID = '22222222-bbbb-4222-b222-222222222222';
export const BLOG_E2E_CATEGORY_SLUG = 'e2e-category';
export const BLOG_E2E_TAG_ID = '33333333-cccc-4333-c333-333333333333';
export const BLOG_E2E_TAG_SLUG = 'e2e-tag';

let app: INestApplication | null = null;
let dbInitialized = false;

async function seedBlogE2EData(): Promise<void> {
  const prisma = getTestPrismaClient();
  if (!prisma) return;

  // Seed authors (users)
  await prisma.user.upsert({
    where: { id: BLOG_E2E_USER_ID },
    create: {
      id: BLOG_E2E_USER_ID,
      email: 'e2e-blog-user@example.com',
      passwordHash: 'test-hash',
      firstName: 'E2E',
      lastName: 'BlogUser',
      role: 'USER',
      status: 'ACTIVE',
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { id: BLOG_E2E_ADMIN_ID },
    create: {
      id: BLOG_E2E_ADMIN_ID,
      email: 'e2e-blog-admin@example.com',
      passwordHash: 'test-hash',
      firstName: 'E2E',
      lastName: 'BlogAdmin',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    update: {},
  });

  // Seed taxonomy
  await prisma.blogCategory.upsert({
    where: { id: BLOG_E2E_CATEGORY_ID },
    create: {
      id: BLOG_E2E_CATEGORY_ID,
      name: 'E2E Category',
      slug: BLOG_E2E_CATEGORY_SLUG,
      description: 'Category for blog E2E tests',
    },
    update: {},
  });

  await prisma.blogTag.upsert({
    where: { id: BLOG_E2E_TAG_ID },
    create: {
      id: BLOG_E2E_TAG_ID,
      name: 'E2E Tag',
      slug: BLOG_E2E_TAG_SLUG,
    },
    update: {},
  });

  // Seed a published post
  await prisma.blogPost.upsert({
    where: { id: BLOG_E2E_POST_ID },
    create: {
      id: BLOG_E2E_POST_ID,
      slug: BLOG_E2E_POST_SLUG,
      title: 'E2E Blog Post',
      excerpt: 'E2E post excerpt',
      content: 'E2E post content',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      categoryId: BLOG_E2E_CATEGORY_ID,
      authorId: BLOG_E2E_USER_ID,
      likeCount: 0,
      viewCount: 0,
    } as any,
    update: {},
  });

  // Connect tag to post
  await prisma.blogPost.update({
    where: { id: BLOG_E2E_POST_ID },
    data: {
      tags: {
        connect: [{ id: BLOG_E2E_TAG_ID }],
      },
    },
  });
}

export async function setupApp(): Promise<INestApplication> {
  if (!dbInitialized) {
    await setupTestDatabase();
    await resetTestDatabase();
    await seedBlogE2EData();
    dbInitialized = true;
  }

  if (app) {
    return app;
  }

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
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
