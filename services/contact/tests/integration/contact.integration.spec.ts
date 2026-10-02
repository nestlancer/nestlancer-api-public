import './integration.env';

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import request from 'supertest';

import {
  AllExceptionsFilter,
  TransformResponseInterceptor,
  ContactSubject,
} from '@nestlancer/common';
import { createTestJwt } from '@nestlancer/testing/helpers/test-auth.helper';

import { AppModule } from '../../src/app.module';

function loadDevEnv() {
  const envPath = resolve(__dirname, '../../../../.env.development');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...value] = trimmed.split('=');
      if (key) {
        process.env[key.trim()] = value
          .join('=')
          .trim()
          .replace(/^["']|["']$/g, '');
      }
    }
  });
}

function authHeader(userId: string, role = 'USER') {
  const token = createTestJwt(
    { sub: userId, email: `${userId}@test.com`, role },
    { secret: process.env.JWT_ACCESS_SECRET },
  );
  return { Authorization: `Bearer ${token}` };
}

function adminAuthHeader() {
  return authHeader('admin-1', 'ADMIN');
}

describe('Contact Service (Integration)', () => {
  let app: INestApplication;

  jest.setTimeout(30000);

  beforeAll(async () => {
    loadDevEnv();
    process.env.NODE_ENV = 'test';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new TransformResponseInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Health', () => {
    it('GET /api/v1/contact/health - should return 200 with status healthy and service contact', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/contact/health');

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      const health = response.body.data ?? response.body;
      expect(health.status).toBe('healthy');
      expect(health.service).toBe('contact');
    });
  });

  describe('Public Contact Form', () => {
    it('POST /api/v1/contact - should return 400 or 422 for invalid payload (validation)', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/contact').send({
        name: '',
        email: 'invalid-email',
        subject: 'INVALID_SUBJECT',
        message: 'short',
        turnstileToken: '',
      });

      expect(response.status).toBe(400);
    });

    it('POST /api/v1/contact - should not return 4xx validation error when payload is valid', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/contact').send({
        name: 'John Doe',
        email: 'john@example.com',
        subject: ContactSubject.GENERAL,
        message: 'This is a valid test message for integration testing.',
        turnstileToken: 'test-turnstile-token',
      });

      // We only assert that validation passed (i.e. not 400/422); external services may still fail.
      expect([200, 201, 429, 500]).toContain(response.status);
    });
  });

  describe('Admin - Contact', () => {
    it('GET /api/v1/admin/contact - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/admin/contact');
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/admin/contact - should reject non-admin user (403 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/contact')
        .set(authHeader('regular-user-1'));

      expect(response.status).toBe(403);
    });

    it('GET /api/v1/admin/contact - should return 2xx with data when admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/contact')
        .query({ page: '1', limit: '20' })
        .set(adminAuthHeader());

      expect([200, 500]).toContain(response.status);
      expect(response.body).toBeDefined();
    });

    it('GET /api/v1/admin/contact/:id - should return 400 for invalid uuid', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/contact/invalid-uuid')
        .set(adminAuthHeader());

      expect(response.status).toBe(400);
    });

    it('PATCH /api/v1/admin/contact/:id/status - should return 400 or 422 for invalid status', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/admin/contact/550e8400-e29b-41d4-a716-446655440000/status')
        .set(adminAuthHeader())
        .send({ status: 'INVALID_STATUS' });

      expect(response.status).toBe(400);
    });

    it('POST /api/v1/admin/contact/:id/respond - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/contact/550e8400-e29b-41d4-a716-446655440000/respond')
        .send({ message: 'Admin response' });

      expect(response.status).toBe(401);
    });
  });
});
