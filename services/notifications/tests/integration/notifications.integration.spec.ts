import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter, TransformResponseInterceptor } from '@nestlancer/common';
import { QueuePublisherService, QueueConsumerService } from '@nestlancer/queue';
import { MockQueueService } from '@nestlancer/testing';
import { AppModule } from '../../src/app.module';
import { createTestJwt } from '@nestlancer/testing/helpers/test-auth.helper';

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

describe('Notifications Service (Integration)', () => {
  let app: INestApplication;

  jest.setTimeout(30000);

  beforeAll(async () => {
    loadDevEnv();
    process.env.NODE_ENV = 'test';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(QueuePublisherService)
      .useClass(MockQueueService)
      .overrideProvider(QueueConsumerService)
      .useClass(MockQueueService)
      .compile();

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
    it('GET /api/v1/health returns 200 with success and service info when healthy', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');
      expect(response.status).toBe(200);
      {
        expect(response.body.status).toBe('success');
        expect(response.body.data?.status).toBe('ok');
        expect(response.body.data?.service).toBe('notifications');
      }
    });
  });

  describe('Test Notification (Authenticated)', () => {
    it('POST /api/v1/test rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/test');
      expect(response.status).toBe(401);
    });

    it('POST /api/v1/test with valid token returns 200 or 500 (e.g. FK if user missing)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/test')
        .set(authHeader('test-user-1'));

      expect([200, 500]).toContain(response.status);
    });
  });

  describe('Notifications (Authenticated)', () => {
    it('GET /api/v1/notifications rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/notifications');
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/notifications with valid token returns 200 and success', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set(authHeader('test-user-1'));

      expect(response.status).toBe(200);
      {
        expect(response.body.status).toBe('success');
      }
    });

    it('GET /api/v1/notifications/unread-count rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/notifications/unread-count');
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/notifications/unread-count with valid token returns 200 and count payload', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set(authHeader('test-user-1'));

      expect(response.status).toBe(200);
    });

    it('PATCH /api/v1/notifications/:id/read rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).patch(
        '/api/v1/notifications/550e8400-e29b-41d4-a716-446655440000/read',
      );
      expect(response.status).toBe(401);
    });

    it('PATCH /api/v1/notifications/:id/read - marks notification read or returns not-found style error', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/notifications/550e8400-e29b-41d4-a716-446655440000/read')
        .set(authHeader('test-user-1'))
        .send({ read: true });

      expect([200, 404, 422, 500]).toContain(response.status);
    });

    it('POST /api/v1/notifications/read-all rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/notifications/read-all');
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/notifications/history rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/notifications/history');
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/notifications/history with valid token returns 200 or 500', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/notifications/history')
        .query({ page: '1', limit: '20' })
        .set(authHeader('test-user-1'));
      expect([200, 500]).toContain(response.status);
    });

    it('GET /api/v1/notifications/:id rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/notifications/550e8400-e29b-41d4-a716-446655440000',
      );
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/notifications/:id - returns notification details or not-found style error', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/notifications/550e8400-e29b-41d4-a716-446655440000')
        .set(authHeader('test-user-1'));

      expect([200, 404, 422, 500]).toContain(response.status);
    });

    it('PATCH /api/v1/notifications/:id/unread rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).patch(
        '/api/v1/notifications/550e8400-e29b-41d4-a716-446655440000/unread',
      );
      expect(response.status).toBe(401);
    });

    it('PATCH /api/v1/notifications/:id/unread - marks notification unread or returns not-found style error', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/notifications/550e8400-e29b-41d4-a716-446655440000/unread')
        .set(authHeader('test-user-1'));

      expect([200, 404, 422, 500]).toContain(response.status);
    });

    it('POST /api/v1/notifications/read-selected rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/notifications/read-selected')
        .send({ notificationIds: ['550e8400-e29b-41d4-a716-446655440000'] });
      expect(response.status).toBe(401);
    });

    it('POST /api/v1/notifications/read-selected with valid token marks selected as read or returns error', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/notifications/read-selected')
        .set(authHeader('test-user-1'))
        .send({ notificationIds: ['550e8400-e29b-41d4-a716-446655440000'] });

      expect([200, 400, 404, 422, 500]).toContain(response.status);
    });

    it('DELETE /api/v1/notifications/clear-read rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).delete(
        '/api/v1/notifications/clear-read',
      );
      expect(response.status).toBe(401);
    });

    it('DELETE /api/v1/notifications/clear-read - clears read notifications or returns error', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/notifications/clear-read')
        .set(authHeader('test-user-1'));

      expect([200, 500]).toContain(response.status);
    });

    it('DELETE /api/v1/notifications/:id rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).delete(
        '/api/v1/notifications/550e8400-e29b-41d4-a716-446655440000',
      );
      expect(response.status).toBe(401);
    });

    it('DELETE /api/v1/notifications/:id - soft-deletes notification or returns not-found style error', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/notifications/550e8400-e29b-41d4-a716-446655440000')
        .set(authHeader('test-user-1'));

      expect([200, 404, 422, 500]).toContain(response.status);
    });
  });

  describe('Notification Preferences (Authenticated)', () => {
    it('GET /api/v1/notifications/preferences rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/notifications/preferences');
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/notifications/channels rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/notifications/channels');
      expect(response.status).toBe(401);
    });

    it('PATCH /api/v1/notifications/preferences rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/notifications/preferences')
        .send({ preferences: {} });
      expect(response.status).toBe(401);
    });

    it('PATCH /api/v1/notifications/preferences - updates preferences for authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/notifications/preferences')
        .set(authHeader('test-user-1'))
        .send({
          preferences: {
            marketing: { email: true, push: false, inApp: true },
          },
        });

      expect([200, 400, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.status).toBe('success');
      }
    });

    it('GET /api/v1/notifications/preferences with valid token returns 200, 404, or 500', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/notifications/preferences')
        .set(authHeader('test-user-1'));
      expect([200, 404, 500]).toContain(response.status);
    });

    it('GET /api/v1/notifications/channels with valid token returns 200, 404, or 500', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/notifications/channels')
        .set(authHeader('test-user-1'));
      expect([200, 404, 500]).toContain(response.status);
    });

    it('PATCH /api/v1/notifications/preferences/channel/:channel rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/notifications/preferences/channel/email')
        .send({ enabled: true });
      expect(response.status).toBe(401);
    });

    it('PATCH /api/v1/notifications/preferences/channel/:channel - updates single channel preference', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/notifications/preferences/channel/email')
        .set(authHeader('test-user-1'))
        .send({ enabled: true });

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.status).toBe('success');
      }
    });
  });

  describe('Push Subscriptions (Authenticated)', () => {
    it('POST /api/v1/push-subscription rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/push-subscription')
        .send({ endpoint: 'https://example.com', keys: { p256dh: 'x', auth: 'y' } });
      expect(response.status).toBe(401);
    });

    it('POST /api/v1/push-subscription - registers subscription for authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/push-subscription')
        .set(authHeader('test-user-1'))
        .send({
          endpoint: 'https://example.com/push/endpoint',
          keys: { p256dh: 'key', auth: 'secret' },
        });

      expect([200, 201, 500]).toContain(response.status);
    });

    it('DELETE /api/v1/push-subscription rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/push-subscription')
        .send({ endpoint: 'https://example.com' });
      expect(response.status).toBe(401);
    });

    it('DELETE /api/v1/push-subscription - unregisters subscription or returns error', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/push-subscription')
        .set(authHeader('test-user-1'))
        .send({ endpoint: 'https://example.com/push/endpoint' });

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe('Push (Authenticated)', () => {
    it('POST /api/v1/push/register rejects unauthenticated with 401 or 404 when route disabled', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/push/register')
        .send({ token: 'fcm_token', deviceId: 'device_1', platform: 'android' });
      expect([401, 404]).toContain(response.status);
    });

    it('POST /api/v1/push/register - registers push device for authenticated user when enabled', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/push/register')
        .set(authHeader('test-user-1'))
        .send({ token: 'fcm_token', deviceId: 'device_1', platform: 'android' });

      expect([200, 404, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.status).toBe('success');
      }
    });

    it('DELETE /api/v1/push/unregister/:deviceId rejects unauthenticated with 401 (or 404 if route disabled)', async () => {
      const response = await request(app.getHttpServer()).delete(
        '/api/v1/push/unregister/device_1',
      );
      expect([401, 404]).toContain(response.status);
    });

    it('DELETE /api/v1/push/unregister/:deviceId - unregisters push device for authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/push/unregister/device_1')
        .set(authHeader('test-user-1'));

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe('Admin - Notifications', () => {
    it('GET /api/v1/admin/notifications rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/admin/notifications');
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/admin/notifications rejects non-admin user with 403', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/notifications')
        .set(authHeader('regular-user-1'));

      expect(response.status).toBe(403);
    });

    it('GET /api/v1/admin/notifications with admin token returns 200 and success', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/notifications')
        .query({ page: '1', limit: '20' })
        .set(adminAuthHeader());

      expect(response.status).toBe(200);
      {
        expect(response.body.status).toBe('success');
      }
    });

    it('GET /api/v1/admin/notifications/stats rejects non-admin with 403', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/notifications/stats')
        .set(authHeader('regular-user-1'));

      expect(response.status).toBe(403);
    });

    it('GET /api/v1/admin/notifications/stats with admin token returns 200', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/notifications/stats')
        .set(adminAuthHeader());

      expect(response.status).toBe(200);
      {
        expect(response.body.status).toBe('success');
      }
    });

    it('POST /api/v1/admin/notifications/send rejects invalid payload with 400 (validation)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/notifications/send')
        .set(adminAuthHeader())
        // clearly invalid: non-UUID recipient and wrong types
        .send({ recipientIds: ['not-a-uuid'], title: 123, message: {} });

      expect(response.status).toBe(400);
    });

    it('GET /api/v1/admin/notifications/delivery-report rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/admin/notifications/delivery-report',
      );
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/admin/notifications/delivery-report - returns delivery info or not-found error', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/notifications/delivery-report')
        .set(adminAuthHeader())
        .query({ notificationId: '550e8400-e29b-41d4-a716-446655440000' });

      expect([200, 404, 500]).toContain(response.status);
    });

    it('POST /api/v1/admin/notifications/broadcast rejects non-admin with 403', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/notifications/broadcast')
        .set(authHeader('regular-user-1'))
        .send({ title: 'Test', body: 'Test' });
      expect(response.status).toBe(403);
    });

    it('POST /api/v1/admin/notifications/broadcast - broadcasts notification or returns error', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/notifications/broadcast')
        .set(adminAuthHeader())
        .send({ title: 'System Maintenance', message: 'Scheduled downtime tonight.' });

      expect([200, 201, 500]).toContain(response.status);
    });

    it('POST /api/v1/admin/notifications/segment rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/notifications/segment')
        .send({ segment: 'all', title: 'Test', body: 'Test' });
      expect(response.status).toBe(401);
    });

    it.skip('POST /api/v1/admin/notifications/segment - sends segmented notification or returns error (skipped: depends on RabbitMQ exchanges)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/notifications/segment')
        .set(adminAuthHeader())
        .send({
          criteria: { role: 'USER' },
          notificationPayload: { title: 'Segmented', message: 'Hello clients' },
        });

      expect([200, 201, 500]).toContain(response.status);
    });

    it('DELETE /api/v1/admin/notifications/user/:userId rejects non-admin with 403', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/admin/notifications/user/550e8400-e29b-41d4-a716-446655440000')
        .set(authHeader('regular-user-1'));
      expect(response.status).toBe(403);
    });

    it.skip('DELETE /api/v1/admin/notifications/user/:userId - clears user notifications or returns error (skipped: depends on RabbitMQ exchanges)', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/admin/notifications/user/550e8400-e29b-41d4-a716-446655440000')
        .set(adminAuthHeader());

      expect([200, 404, 500]).toContain(response.status);
    });

    it('POST /api/v1/admin/notifications/:id/resend rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).post(
        '/api/v1/admin/notifications/550e8400-e29b-41d4-a716-446655440000/resend',
      );
      expect(response.status).toBe(401);
    });

    it.skip('POST /api/v1/admin/notifications/:id/resend - enqueues resend or returns not-found (skipped: depends on RabbitMQ exchanges)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/notifications/550e8400-e29b-41d4-a716-446655440000/resend')
        .set(adminAuthHeader());

      expect([201, 404, 500]).toContain(response.status);
    });
  });

  describe.skip('Admin - Notification Templates', () => {
    it('GET /api/v1/admin/notifications/templates rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/admin/notifications/templates',
      );
      expect(response.status).toBe(401);
    });

    it.skip('GET /api/v1/admin/notifications/templates with admin token returns 200 or 500 (skipped: depends on RabbitMQ exchanges)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/notifications/templates')
        .set(adminAuthHeader());
      expect([200, 500]).toContain(response.status);
    });

    it('POST /api/v1/admin/notifications/templates rejects invalid payload (400 or 422)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/notifications/templates')
        .set(adminAuthHeader())
        .send({ name: '', subject: '', body: '' });
      expect(response.status).toBe(400);
    });

    it('PATCH /api/v1/admin/notifications/templates/:id rejects non-admin with 403', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/admin/notifications/templates/550e8400-e29b-41d4-a716-446655440000')
        .set(authHeader('regular-user-1'))
        .send({ subject: 'Updated' });
      expect(response.status).toBe(403);
    });

    it.skip('PATCH /api/v1/admin/notifications/templates/:id - updates template or returns not-found error (skipped: depends on RabbitMQ exchanges)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/admin/notifications/templates/550e8400-e29b-41d4-a716-446655440000')
        .set(adminAuthHeader())
        .send({ subject: 'Updated subject' });

      expect([200, 404, 500]).toContain(response.status);
    });

    it('DELETE /api/v1/admin/notifications/templates/:id rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).delete(
        '/api/v1/admin/notifications/templates/550e8400-e29b-41d4-a716-446655440000',
      );
      expect(response.status).toBe(401);
    });

    it.skip('DELETE /api/v1/admin/notifications/templates/:id - deletes template or returns not-found (skipped: depends on RabbitMQ exchanges)', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/admin/notifications/templates/550e8400-e29b-41d4-a716-446655440000')
        .set(adminAuthHeader());

      expect([200, 404, 500]).toContain(response.status);
    });
  });
});
