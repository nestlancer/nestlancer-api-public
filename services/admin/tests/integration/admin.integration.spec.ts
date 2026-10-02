import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { ValidationPipe } from '@nestjs/common';
import {
  AllExceptionsFilter,
  HttpExceptionFilter,
  TransformResponseInterceptor,
  API_PREFIX,
} from '@nestlancer/common';
import { AppModule } from '../../src/app.module';
import { createTestJwt } from '@nestlancer/testing/helpers/test-auth.helper';
import { ConfigModule } from '@nestjs/config';
import { QueuePublisherService, QueueConsumerService } from '@nestlancer/queue';
import { ImpersonationService } from '../../src/services/impersonation.service';
import { EmailTemplatesService } from '../../src/services/email-templates.service';

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

const basePath = `/${API_PREFIX}`;

describe('Admin Service (Integration)', () => {
  let app: INestApplication;

  jest.setTimeout(30000);

  beforeAll(async () => {
    loadDevEnv();
    if (!process.env.JWT_ACCESS_SECRET) {
      process.env.JWT_ACCESS_SECRET = 'test-secret';
    }

    const moduleRef: TestingModule = await Test.createTestingModule({
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
      .overrideProvider(ImpersonationService)
      .useValue({
        startImpersonation: jest.fn(),
        endImpersonation: jest.fn(),
        getActiveSessions: jest.fn().mockResolvedValue([]),
      })
      .overrideProvider(EmailTemplatesService)
      .useValue({
        findAll: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
        preview: jest.fn().mockResolvedValue({ html: '<p>preview</p>' }),
        sendTest: jest.fn().mockResolvedValue(undefined),
      })
      .compile();

    app = moduleRef.createNestApplication();

    app.setGlobalPrefix(API_PREFIX);
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
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Dashboard', () => {
    it(`GET ${basePath}/dashboard/overview - should reject unauthenticated`, async () => {
      const response = await request(app.getHttpServer()).get(`${basePath}/dashboard/overview`);
      expect(response.status).toBe(401);
    });

    it(`GET ${basePath}/dashboard/overview - should reject non-admin user`, async () => {
      const response = await request(app.getHttpServer())
        .get(`${basePath}/dashboard/overview`)
        .set(authHeader('regular-user-1'));

      expect(response.status).toBe(403);
    });

    it(`GET ${basePath}/dashboard/overview - should accept admin token and return overview data`, async () => {
      const response = await request(app.getHttpServer())
        .get(`${basePath}/dashboard/overview`)
        .set(adminAuthHeader());

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it(`GET ${basePath}/dashboard/revenue - should reject unauthenticated`, async () => {
      const response = await request(app.getHttpServer()).get(`${basePath}/dashboard/revenue`);
      expect(response.status).toBe(401);
    });

    it(`GET ${basePath}/dashboard/revenue - should reject non-admin user`, async () => {
      const response = await request(app.getHttpServer())
        .get(`${basePath}/dashboard/revenue`)
        .set(authHeader('regular-user-1'));
      expect(response.status).toBe(403);
    });

    it(`GET ${basePath}/dashboard/revenue - should accept admin token and return revenue data`, async () => {
      const response = await request(app.getHttpServer())
        .get(`${basePath}/dashboard/revenue`)
        .set(adminAuthHeader());
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it(`GET ${basePath}/dashboard/performance - should reject unauthenticated`, async () => {
      const response = await request(app.getHttpServer()).get(`${basePath}/dashboard/performance`);
      expect(response.status).toBe(401);
    });

    it(`GET ${basePath}/dashboard/performance - should accept admin token and return performance data`, async () => {
      const response = await request(app.getHttpServer())
        .get(`${basePath}/dashboard/performance`)
        .set(adminAuthHeader());
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it(`GET ${basePath}/dashboard/activity - should reject unauthenticated`, async () => {
      const response = await request(app.getHttpServer()).get(`${basePath}/dashboard/activity`);
      expect(response.status).toBe(401);
    });

    it(`GET ${basePath}/dashboard/activity - should accept admin token and return activity data`, async () => {
      const response = await request(app.getHttpServer())
        .get(`${basePath}/dashboard/activity`)
        .set(adminAuthHeader());
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it(`GET ${basePath}/dashboard/alerts - should reject unauthenticated`, async () => {
      const response = await request(app.getHttpServer()).get(`${basePath}/dashboard/alerts`);
      expect(response.status).toBe(401);
    });

    it(`GET ${basePath}/dashboard/alerts - should accept admin token and return alerts`, async () => {
      const response = await request(app.getHttpServer())
        .get(`${basePath}/dashboard/alerts`)
        .set(adminAuthHeader());
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it(`GET ${basePath}/dashboard/users - should accept admin token and return user metrics`, async () => {
      const response = await request(app.getHttpServer())
        .get(`${basePath}/dashboard/users`)
        .set(adminAuthHeader());

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it(`GET ${basePath}/dashboard/projects - should accept admin token and return project metrics`, async () => {
      const response = await request(app.getHttpServer())
        .get(`${basePath}/dashboard/projects`)
        .set(adminAuthHeader());

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });
  });

  describe('System', () => {
    it(`GET ${basePath}/system/config - should reject unauthenticated`, async () => {
      const response = await request(app.getHttpServer()).get(`${basePath}/system/config`);
      expect(response.status).toBe(401);
    });

    it(`GET ${basePath}/system/config - should accept admin token and return config`, async () => {
      const response = await request(app.getHttpServer())
        .get(`${basePath}/system/config`)
        .set(adminAuthHeader());

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it(`GET ${basePath}/system/features - should reject unauthenticated`, async () => {
      const response = await request(app.getHttpServer()).get(`${basePath}/system/features`);
      expect(response.status).toBe(401);
    });

    it(`GET ${basePath}/system/features - should accept admin token and return features`, async () => {
      const response = await request(app.getHttpServer())
        .get(`${basePath}/system/features`)
        .set(adminAuthHeader());
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it(`PATCH ${basePath}/system/features/:flag - should reject unauthenticated`, async () => {
      const response = await request(app.getHttpServer())
        .patch(`${basePath}/system/features/newUI`)
        .send({ enabled: true });
      expect(response.status).toBe(401);
    });

    it(`PATCH ${basePath}/system/features/:flag - should accept admin token and return 200 or 404`, async () => {
      const response = await request(app.getHttpServer())
        .patch(`${basePath}/system/features/newUI`)
        .set(adminAuthHeader())
        .send({ enabled: true });
      expect([200, 404]).toContain(response.status);
    });

    it(`POST ${basePath}/system/maintenance - should reject unauthenticated`, async () => {
      const response = await request(app.getHttpServer())
        .post(`${basePath}/system/maintenance`)
        .send({ enabled: true, message: 'Maintenance' });
      expect(response.status).toBe(401);
    });

    it(`POST ${basePath}/system/cache/clear - should reject non-admin user`, async () => {
      const response = await request(app.getHttpServer())
        .post(`${basePath}/system/cache/clear`)
        .set(authHeader('regular-user-1'));
      expect(response.status).toBe(403);
    });

    it(`POST ${basePath}/system/cache/clear/:key - should reject unauthenticated`, async () => {
      const response = await request(app.getHttpServer()).post(
        `${basePath}/system/cache/clear/some-key`,
      );
      expect(response.status).toBe(401);
    });

    it(`GET ${basePath}/system/jobs - should reject non-admin user`, async () => {
      const response = await request(app.getHttpServer())
        .get(`${basePath}/system/jobs`)
        .set(authHeader('regular-user-1'));

      expect(response.status).toBe(403);
    });

    it(`GET ${basePath}/system/jobs - should accept admin token and return jobs list`, async () => {
      const response = await request(app.getHttpServer())
        .get(`${basePath}/system/jobs`)
        .set(adminAuthHeader());
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it(`POST ${basePath}/system/jobs/:id/retry - should reject unauthenticated`, async () => {
      const response = await request(app.getHttpServer()).post(
        `${basePath}/system/jobs/550e8400-e29b-41d4-a716-446655440000/retry`,
      );
      expect(response.status).toBe(401);
    });

    it(`DELETE ${basePath}/system/jobs/:id - should reject non-admin user`, async () => {
      const response = await request(app.getHttpServer())
        .delete(`${basePath}/system/jobs/550e8400-e29b-41d4-a716-446655440000`)
        .set(authHeader('regular-user-1'));
      expect(response.status).toBe(403);
    });

    it(`GET ${basePath}/system/logs - should reject unauthenticated`, async () => {
      const response = await request(app.getHttpServer()).get(`${basePath}/system/logs`);
      expect(response.status).toBe(401);
    });

    it(`GET ${basePath}/system/logs/download - should reject non-admin user`, async () => {
      const response = await request(app.getHttpServer())
        .get(`${basePath}/system/logs/download`)
        .set(authHeader('regular-user-1'));
      expect(response.status).toBe(403);
    });

    it(`POST ${basePath}/system/announcements - should reject unauthenticated`, async () => {
      const response = await request(app.getHttpServer())
        .post(`${basePath}/system/announcements`)
        .send({ title: 'Test', body: 'Test', level: 'info' });
      expect(response.status).toBe(401);
    });

    it(`PATCH ${basePath}/system/config - should reject invalid payload (validation)`, async () => {
      const response = await request(app.getHttpServer())
        .patch(`${basePath}/system/config`)
        .set(adminAuthHeader())
        .send({ invalidKey: 123 });

      expect(response.status).toBe(400);
    });
  });

  describe('Audit', () => {
    it(`GET ${basePath}/audit - should reject unauthenticated`, async () => {
      const response = await request(app.getHttpServer()).get(`${basePath}/audit`);
      expect(response.status).toBe(401);
    });

    it(`GET ${basePath}/audit - should accept admin token and return paginated logs`, async () => {
      const response = await request(app.getHttpServer())
        .get(`${basePath}/audit`)
        .query({ page: '1', limit: '20' })
        .set(adminAuthHeader());

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it(`GET ${basePath}/audit/stats - should reject non-admin user`, async () => {
      const response = await request(app.getHttpServer())
        .get(`${basePath}/audit/stats`)
        .set(authHeader('regular-user-1'));

      expect(response.status).toBe(403);
    });

    it(`GET ${basePath}/audit/user/:userId - should reject unauthenticated`, async () => {
      const response = await request(app.getHttpServer()).get(
        `${basePath}/audit/user/550e8400-e29b-41d4-a716-446655440000`,
      );
      expect(response.status).toBe(401);
    });

    it(`GET ${basePath}/audit/user/:userId - should accept admin token and return logs or 404`, async () => {
      const response = await request(app.getHttpServer())
        .get(`${basePath}/audit/user/550e8400-e29b-41d4-a716-446655440000`)
        .set(adminAuthHeader());
      expect([200, 404]).toContain(response.status);
    });

    it(`GET ${basePath}/audit/resource/:type/:id - should reject non-admin user`, async () => {
      const response = await request(app.getHttpServer())
        .get(`${basePath}/audit/resource/Project/550e8400-e29b-41d4-a716-446655440000`)
        .set(authHeader('regular-user-1'));
      expect(response.status).toBe(403);
    });

    it(`GET ${basePath}/audit/:id - should reject unauthenticated`, async () => {
      const response = await request(app.getHttpServer()).get(
        `${basePath}/audit/550e8400-e29b-41d4-a716-446655440000`,
      );
      expect(response.status).toBe(401);
    });

    it(`POST ${basePath}/audit/export - should reject non-admin user`, async () => {
      const response = await request(app.getHttpServer())
        .post(`${basePath}/audit/export`)
        .set(authHeader('regular-user-1'))
        .send({ format: 'json', from: '2025-01-01', to: '2025-12-31' });
      expect(response.status).toBe(403);
    });
  });

  describe('Webhooks (Admin)', () => {
    it(`GET ${basePath}/webhooks - should reject unauthenticated`, async () => {
      const response = await request(app.getHttpServer()).get(`${basePath}/webhooks`);
      expect(response.status).toBe(401);
    });

    it(`GET ${basePath}/webhooks - should accept admin token and return webhooks list`, async () => {
      const response = await request(app.getHttpServer())
        .get(`${basePath}/webhooks`)
        .set(adminAuthHeader());

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it(`GET ${basePath}/webhooks/events - should reject non-admin user`, async () => {
      const response = await request(app.getHttpServer())
        .get(`${basePath}/webhooks/events`)
        .set(authHeader('regular-user-1'));

      expect(response.status).toBe(403);
    });

    it(`POST ${basePath}/webhooks - should reject invalid payload (validation)`, async () => {
      const response = await request(app.getHttpServer())
        .post(`${basePath}/webhooks`)
        .set(adminAuthHeader())
        .send({ url: 'not-a-valid-url', events: [] });

      expect(response.status).toBe(400);
    });

    it(`GET ${basePath}/webhooks/:id - should reject unauthenticated`, async () => {
      const response = await request(app.getHttpServer()).get(
        `${basePath}/webhooks/550e8400-e29b-41d4-a716-446655440000`,
      );
      expect(response.status).toBe(401);
    });

    it(`GET ${basePath}/webhooks/:id - should accept admin token and return webhook or 404`, async () => {
      const response = await request(app.getHttpServer())
        .get(`${basePath}/webhooks/550e8400-e29b-41d4-a716-446655440000`)
        .set(adminAuthHeader());
      expect([200, 404]).toContain(response.status);
    });

    it(`PATCH ${basePath}/webhooks/:id - should reject invalid payload (validation)`, async () => {
      const response = await request(app.getHttpServer())
        .patch(`${basePath}/webhooks/550e8400-e29b-41d4-a716-446655440000`)
        .set(adminAuthHeader())
        .send({ url: 'not-a-valid-url' });
      expect(response.status).toBe(400);
    });

    it(`DELETE ${basePath}/webhooks/:id - should reject non-admin user`, async () => {
      const response = await request(app.getHttpServer())
        .delete(`${basePath}/webhooks/550e8400-e29b-41d4-a716-446655440000`)
        .set(authHeader('regular-user-1'));
      expect(response.status).toBe(403);
    });

    it(`POST ${basePath}/webhooks/:id/test - should reject unauthenticated`, async () => {
      const response = await request(app.getHttpServer()).post(
        `${basePath}/webhooks/550e8400-e29b-41d4-a716-446655440000/test`,
      );
      expect(response.status).toBe(401);
    });

    it(`GET ${basePath}/webhooks/:id/deliveries - should reject non-admin user`, async () => {
      const response = await request(app.getHttpServer())
        .get(`${basePath}/webhooks/550e8400-e29b-41d4-a716-446655440000/deliveries`)
        .set(authHeader('regular-user-1'));
      expect(response.status).toBe(403);
    });

    it(`POST ${basePath}/webhooks/:id/enable - should reject unauthenticated`, async () => {
      const response = await request(app.getHttpServer()).post(
        `${basePath}/webhooks/550e8400-e29b-41d4-a716-446655440000/enable`,
      );
      expect(response.status).toBe(401);
    });

    it(`POST ${basePath}/webhooks/:id/disable - should reject non-admin user`, async () => {
      const response = await request(app.getHttpServer())
        .post(`${basePath}/webhooks/550e8400-e29b-41d4-a716-446655440000/disable`)
        .set(authHeader('regular-user-1'));
      expect(response.status).toBe(403);
    });

    it(`GET ${basePath}/webhooks/:id/stats - should reject unauthenticated`, async () => {
      const response = await request(app.getHttpServer()).get(
        `${basePath}/webhooks/550e8400-e29b-41d4-a716-446655440000/stats`,
      );
      expect(response.status).toBe(401);
    });
  });

  describe('Email Templates', () => {
    it(`GET ${basePath}/system/email-templates - should reject unauthenticated`, async () => {
      const response = await request(app.getHttpServer()).get(`${basePath}/system/email-templates`);
      expect(response.status).toBe(401);
    });

    it(`GET ${basePath}/system/email-templates - should accept admin token and return templates`, async () => {
      const response = await request(app.getHttpServer())
        .get(`${basePath}/system/email-templates`)
        .set(adminAuthHeader());

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it(`GET ${basePath}/system/email-templates/:id - should reject unauthenticated`, async () => {
      const response = await request(app.getHttpServer()).get(
        `${basePath}/system/email-templates/550e8400-e29b-41d4-a716-446655440000`,
      );
      expect(response.status).toBe(401);
    });

    it(`GET ${basePath}/system/email-templates/:id - should accept admin token and return template or 404`, async () => {
      const response = await request(app.getHttpServer())
        .get(`${basePath}/system/email-templates/550e8400-e29b-41d4-a716-446655440000`)
        .set(adminAuthHeader());
      expect([200, 404]).toContain(response.status);
    });

    it(`GET ${basePath}/system/email-templates/:id/preview - should reject non-admin user`, async () => {
      const response = await request(app.getHttpServer())
        .get(`${basePath}/system/email-templates/550e8400-e29b-41d4-a716-446655440000/preview`)
        .set(authHeader('regular-user-1'));
      expect(response.status).toBe(403);
    });

    it(`POST ${basePath}/system/email-templates/:id/test - should reject unauthenticated`, async () => {
      const response = await request(app.getHttpServer())
        .post(`${basePath}/system/email-templates/550e8400-e29b-41d4-a716-446655440000/test`)
        .send({ to: 'test@example.com' });
      expect(response.status).toBe(401);
    });
  });

  describe('Impersonation', () => {
    it(`POST ${basePath}/users/:userId/impersonate - should reject unauthenticated`, async () => {
      const response = await request(app.getHttpServer())
        .post(`${basePath}/users/550e8400-e29b-41d4-a716-446655440000/impersonate`)
        .send({ reason: 'Test', durationMinutes: 60 });

      expect(response.status).toBe(401);
    });

    it(`POST ${basePath}/users/:userId/impersonate - should reject non-admin user`, async () => {
      const response = await request(app.getHttpServer())
        .post(`${basePath}/users/550e8400-e29b-41d4-a716-446655440000/impersonate`)
        .set(authHeader('regular-user-1'))
        .send({ reason: 'Test', durationMinutes: 60 });

      expect(response.status).toBe(403);
    });

    it(`POST ${basePath}/users/impersonate/end/:sessionId - should reject unauthenticated`, async () => {
      const response = await request(app.getHttpServer()).post(
        `${basePath}/users/impersonate/end/session-123`,
      );
      expect(response.status).toBe(401);
    });

    it(`POST ${basePath}/users/impersonate/end/:sessionId - should reject non-admin user`, async () => {
      const response = await request(app.getHttpServer())
        .post(`${basePath}/users/impersonate/end/session-123`)
        .set(authHeader('regular-user-1'));
      expect(response.status).toBe(403);
    });

    it(`GET ${basePath}/users/impersonate/sessions - should reject unauthenticated`, async () => {
      const response = await request(app.getHttpServer()).get(
        `${basePath}/users/impersonate/sessions`,
      );
      expect(response.status).toBe(401);
    });

    it(`GET ${basePath}/users/impersonate/sessions - should accept admin token and return sessions or empty`, async () => {
      const response = await request(app.getHttpServer())
        .get(`${basePath}/users/impersonate/sessions`)
        .set(adminAuthHeader());
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });
  });
});
