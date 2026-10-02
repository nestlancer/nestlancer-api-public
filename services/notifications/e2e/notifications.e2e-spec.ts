import request from 'supertest';
import { createTestJwt } from '../../../libs/testing/src/helpers/test-auth.helper';
import { setupApp, teardownApp, getAppUrl, getGlobalPrefix } from './setup';

const prefix = getGlobalPrefix();
const basePath = () => `${getAppUrl()}/${prefix}`;

function authHeader(userId: string, role = 'USER') {
  const token = createTestJwt(
    { sub: userId, email: `${userId}@test.com`, role },
    { secret: process.env.JWT_ACCESS_SECRET },
  );
  return { Authorization: `Bearer ${token}` };
}

function adminAuthHeader() {
  return authHeader('e2e-notifications-admin-1', 'ADMIN');
}

describe('Notifications Service (E2E)', () => {
  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  describe('Health (smoke)', () => {
    it('GET /health returns 200 with success envelope and ok status', async () => {
      const res = await request(getAppUrl().replace(/\/$/, ''))
        .get(`/${prefix}/health`)
        .expect(200);

      expect(res.body?.status).toBe('success');
      expect(res.body?.data?.status).toBe('ok');
      expect(res.body?.data?.service).toBe('notifications');
    });
  });

  describe('Auth', () => {
    it('GET /notifications without token returns 401 error', async () => {
      const res = await request(basePath()).get('/notifications').expect(401);

      expect(res.status).toBe(401);
      expect(res.body?.status).toBe('error');
    });

    it('GET /notifications/preferences without token returns 401 error', async () => {
      const res = await request(basePath()).get('/notifications/preferences').expect(401);

      expect(res.status).toBe(401);
      expect(res.body?.status).toBe('error');
    });

    it('GET /admin/notifications without token returns 401 error', async () => {
      const res = await request(basePath()).get('/admin/notifications').expect(401);

      expect(res.status).toBe(401);
      expect(res.body?.status).toBe('error');
    });

    it('GET /admin/notifications with USER role returns 403 error', async () => {
      const res = await request(basePath())
        .get('/admin/notifications')
        .set(authHeader('e2e-notifications-user-auth-1', 'USER'))
        .expect(403);

      expect(res.status).toBe(403);
      expect(res.body?.status).toBe('error');
    });
  });

  describe('Client - Notifications lifecycle', () => {
    const userId = 'e2e-notifications-user-1';
    let notificationId: string | undefined;

    it('POST /test with valid token sends a test notification (201)', async () => {
      const res = await request(basePath()).post('/test').set(authHeader(userId)).expect(201);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.sent).toBe(true);
    });

    it('GET /notifications returns 200 and paginated list for current user', async () => {
      const res = await request(basePath())
        .get('/notifications')
        .set(authHeader(userId))
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(Array.isArray(data?.data)).toBe(true);
      expect(data?.pagination).toBeDefined();

      if (data.data.length > 0) {
        notificationId = data.data[0].id;
      }
    });

    it('GET /notifications/unread-count returns 200 and unread count payload', async () => {
      const res = await request(basePath())
        .get('/notifications/unread-count')
        .set(authHeader(userId))
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(typeof data?.count).toBe('number');
    });

    it('GET /notifications/history returns 200 and paginated history list', async () => {
      const res = await request(basePath())
        .get('/notifications/history')
        .set(authHeader(userId))
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(Array.isArray(data?.data)).toBe(true);
      expect(data?.pagination).toBeDefined();
    });

    it('GET /notifications/:id for non-existent id returns 404 error', async () => {
      const res = await request(basePath())
        .get('/notifications/00000000-0000-0000-0000-000000000000')
        .set(authHeader(userId))
        .expect(404);

      expect(res.body?.status).toBe('error');
      expect(typeof res.body?.error?.message).toBe('string');
    });

    it('GET /notifications/:id for existing notification returns 200 and notification details', async () => {
      if (!notificationId) {
        // If no notification was captured, create one first so this path is deterministic.
        const createRes = await request(basePath())
          .post('/test')
          .set(authHeader(userId))
          .expect(201);
        const createData = createRes.body?.data ?? createRes.body;
        expect(createData?.sent).toBe(true);

        const listRes = await request(basePath())
          .get('/notifications')
          .set(authHeader(userId))
          .expect(200);
        const listData = listRes.body?.data ?? listRes.body;
        notificationId = listData?.data?.[0]?.id;
      }

      const res = await request(basePath())
        .get(`/notifications/${notificationId}`)
        .set(authHeader(userId))
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.id).toBe(notificationId);
    });

    it('PATCH /notifications/:id/read marks notification as read and returns 200', async () => {
      if (!notificationId) {
        const listRes = await request(basePath())
          .get('/notifications')
          .set(authHeader(userId))
          .expect(200);
        const listData = listRes.body?.data ?? listRes.body;
        notificationId = listData?.data?.[0]?.id;
      }

      const res = await request(basePath())
        .patch(`/notifications/${notificationId}/read`)
        .set(authHeader(userId))
        .send({ read: true })
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.id).toBe(notificationId);
      expect(data?.readAt).toBeDefined();
    });

    it('PATCH /notifications/:id/unread marks notification as unread and returns 200', async () => {
      if (!notificationId) {
        const listRes = await request(basePath())
          .get('/notifications')
          .set(authHeader(userId))
          .expect(200);
        const listData = listRes.body?.data ?? listRes.body;
        notificationId = listData?.data?.[0]?.id;
      }

      const res = await request(basePath())
        .patch(`/notifications/${notificationId}/unread`)
        .set(authHeader(userId))
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.id).toBe(notificationId);
      expect(data?.readAt ?? null).toBeNull();
    });

    it('POST /notifications/read-all marks all notifications as read and returns 200', async () => {
      const res = await request(basePath())
        .post('/notifications/read-all')
        .set(authHeader(userId))
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(typeof data?.count).toBe('number');
    });

    it('POST /notifications/read-selected marks selected notifications as read and returns 200', async () => {
      if (!notificationId) {
        const createRes = await request(basePath())
          .post('/test')
          .set(authHeader(userId))
          .expect(201);
        const createData = createRes.body?.data ?? createRes.body;
        expect(createData?.sent).toBe(true);

        const listRes = await request(basePath())
          .get('/notifications')
          .set(authHeader(userId))
          .expect(200);
        const listData = listRes.body?.data ?? listRes.body;
        notificationId = listData?.data?.[0]?.id;
      }

      const res = await request(basePath())
        .post('/notifications/read-selected')
        .set(authHeader(userId))
        .send({ notificationIds: [notificationId] })
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(typeof data?.count).toBe('number');
    });

    it('DELETE /notifications/clear-read clears read notifications and returns 200', async () => {
      const res = await request(basePath())
        .delete('/notifications/clear-read')
        .set(authHeader(userId))
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(typeof data?.count).toBe('number');
    });

    it('DELETE /notifications/:id soft-deletes a notification and returns 200', async () => {
      if (!notificationId) {
        const createRes = await request(basePath())
          .post('/test')
          .set(authHeader(userId))
          .expect(201);
        const createData = createRes.body?.data ?? createRes.body;
        expect(createData?.sent).toBe(true);

        const listRes = await request(basePath())
          .get('/notifications')
          .set(authHeader(userId))
          .expect(200);
        const listData = listRes.body?.data ?? listRes.body;
        notificationId = listData?.data?.[0]?.id;
      }

      const res = await request(basePath())
        .delete(`/notifications/${notificationId}`)
        .set(authHeader(userId))
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(typeof data?.count).toBe('number');
    });
  });

  describe('Client - Preferences and channels', () => {
    const userId = 'e2e-notifications-user-prefs-1';

    it('GET /notifications/preferences returns 200 and preferences payload with userId', async () => {
      const res = await request(basePath())
        .get('/notifications/preferences')
        .set(authHeader(userId))
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.userId).toBe(userId);
      expect(data?.preferences).toBeDefined();
      expect(data?.quietHours).toBeDefined();
    });

    it('PATCH /notifications/preferences updates preferences and returns 200 with channels map', async () => {
      const payload = {
        preferences: {
          marketing: { email: true, push: false, inApp: true },
        },
        quietHours: {
          start: '22:00',
          end: '06:00',
          timezone: 'UTC',
        },
      };

      const res = await request(basePath())
        .patch('/notifications/preferences')
        .set(authHeader(userId))
        .send(payload)
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.channels).toBeDefined();
      expect(data?.channels?.marketing).toBeDefined();
      expect(data?.channels?.marketing?.email).toBe(true);
    });

    it('GET /notifications/channels returns 200 and list of available channels', async () => {
      const res = await request(basePath())
        .get('/notifications/channels')
        .set(authHeader(userId))
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(1);
      expect(data[0]).toHaveProperty('id');
      expect(data[0]).toHaveProperty('name');
      expect(data[0]).toHaveProperty('status');
    });

    it('GET /notifications/preferences/channels returns 200 and same channel list (alias)', async () => {
      const res = await request(basePath())
        .get('/notifications/preferences/channels')
        .set(authHeader(userId))
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(1);
      expect(data[0]).toHaveProperty('id');
    });

    it('PATCH /notifications/preferences/channel/:channel updates channel and returns 200', async () => {
      const res = await request(basePath())
        .patch('/notifications/preferences/channel/inApp')
        .set(authHeader(userId))
        .send({ enabled: false })
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.userId).toBe(userId);
      expect(data?.channel).toBe('inApp');
      expect(data?.enabled).toBe(false);
      expect(data?.updated).toBe(true);
    });
  });

  describe('Client - Push subscriptions', () => {
    const userId = 'e2e-notifications-user-push-1';
    const endpoint = 'https://push.example.com/subscriptions/e2e-1';

    it('POST /push-subscription registers a subscription and returns 201 with subscription id', async () => {
      const payload = {
        endpoint,
        keys: {
          p256dh: 'test-p256dh-key',
          auth: 'test-auth-key',
        },
        deviceInfo: JSON.stringify({ os: 'linux', browser: 'chrome' }),
      };

      const res = await request(basePath())
        .post('/push-subscription')
        .set(authHeader(userId))
        .send(payload)
        .expect(201);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.subscriptionId).toBeDefined();
      expect(data?.active).toBe(true);
    });

    it('DELETE /push-subscription removes a subscription and returns 200 with success flag', async () => {
      const res = await request(basePath())
        .delete('/push-subscription')
        .set(authHeader(userId))
        .send({ endpoint })
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.success).toBe(true);
    });
  });

  describe('Client - Push device (push controller)', () => {
    const userId = 'e2e-notifications-user-push-device-1';
    const deviceId = 'e2e-device-001';

    it('POST /push/register registers device token and returns 200', async () => {
      const res = await request(basePath())
        .post('/push/register')
        .set(authHeader(userId))
        .send({ token: 'fcm_e2e_token_123', deviceId, platform: 'android' })
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.userId).toBe(userId);
      expect(data?.deviceId).toBe(deviceId);
      expect(data?.registered).toBe(true);
    });

    it('DELETE /push/unregister/:deviceId returns 200 with unregistered flag', async () => {
      const res = await request(basePath())
        .delete(`/push/unregister/${deviceId}`)
        .set(authHeader(userId))
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.userId).toBe(userId);
      expect(data?.deviceId).toBe(deviceId);
      expect(data?.unregistered).toBe(true);
    });
  });

  describe('Admin - Listings and stats', () => {
    it('GET /admin/notifications with admin token returns 200 and paginated list', async () => {
      const res = await request(basePath())
        .get('/admin/notifications')
        .set(adminAuthHeader())
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(Array.isArray(data?.data)).toBe(true);
      expect(data?.pagination).toBeDefined();
    });

    it('GET /admin/notifications/stats returns 200 and stats payload', async () => {
      const res = await request(basePath())
        .get('/admin/notifications/stats')
        .set(adminAuthHeader())
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(typeof data?.totalCount).toBe('number');
      expect(typeof data?.unreadCount).toBe('number');
    });

    it('DELETE /admin/notifications/user/:userId clears notifications for a user and returns 200', async () => {
      const targetUserId = 'e2e-notifications-clear-user-1';

      const res = await request(basePath())
        .delete(`/admin/notifications/user/${targetUserId}`)
        .set(adminAuthHeader())
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(typeof data?.count).toBe('number');
    });

    it('POST /admin/notifications/send sends targeted notifications and returns 201 with queued count', async () => {
      const payload = {
        recipientIds: ['e2e-notifications-target-1', 'e2e-notifications-target-2'],
        title: 'E2E Targeted Notification',
        message: 'E2E test targeted notification message.',
        type: 'system.e2e',
      };

      const res = await request(basePath())
        .post('/admin/notifications/send')
        .set(adminAuthHeader())
        .send(payload)
        .expect(201);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.queued).toBe(payload.recipientIds.length);
    });

    it('GET /admin/notifications/delivery-report returns 200 and array for given notificationId', async () => {
      const res = await request(basePath())
        .get(
          '/admin/notifications/delivery-report?notificationId=00000000-0000-0000-0000-000000000000',
        )
        .set(adminAuthHeader())
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(Array.isArray(data)).toBe(true);
    });

    it('POST /admin/notifications/broadcast returns 200 with scheduled envelope (queue mocked)', async () => {
      const payload = {
        title: 'E2E Broadcast',
        message: 'E2E broadcast message.',
      };

      const res = await request(basePath())
        .post('/admin/notifications/broadcast')
        .set(adminAuthHeader())
        .send(payload)
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.status).toBe('scheduled');
      expect(data?.accepted).toBe(true);
    });

    it('POST /admin/notifications/segment returns 201 with segmentedUsersCount', async () => {
      const payload = {
        criteria: { role: 'USER' },
        notificationPayload: { title: 'Segment E2E', message: 'Segment test.', type: 'system.e2e' },
      };

      const res = await request(basePath())
        .post('/admin/notifications/segment')
        .set(adminAuthHeader())
        .send(payload)
        .expect(201);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(typeof data?.segmentedUsersCount).toBe('number');
    });

    it('POST /admin/notifications/:id/resend returns 200 with id and status resent for existing notification', async () => {
      const sendRes = await request(basePath())
        .post('/admin/notifications/send')
        .set(adminAuthHeader())
        .send({
          recipientIds: ['e2e-notifications-resend-target-1'],
          title: 'For Resend E2E',
          message: 'Message.',
          type: 'system.e2e',
        })
        .expect(201);

      expect(sendRes.body?.status).toBe('success');

      const listRes = await request(basePath())
        .get('/admin/notifications?limit=1')
        .set(adminAuthHeader())
        .expect(200);

      const listData = listRes.body?.data ?? listRes.body;
      const id = listData?.data?.[0]?.id;
      expect(id).toBeDefined();

      const res = await request(basePath())
        .post(`/admin/notifications/${id}/resend`)
        .set(adminAuthHeader())
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.id).toBe(id);
      expect(data?.status).toBe('resent');
    });
  });

  describe('Admin - Notification templates', () => {
    it('GET /admin/notifications/templates without token returns 401', async () => {
      const res = await request(basePath()).get('/admin/notifications/templates').expect(401);
      expect(res.status).toBe(401);
      expect(res.body?.status).toBe('error');
    });

    it('GET /admin/notifications/templates with USER role returns 403', async () => {
      const res = await request(basePath())
        .get('/admin/notifications/templates')
        .set(authHeader('e2e-user-1', 'USER'))
        .expect(403);
      expect(res.body?.status).toBe('error');
    });

    it('GET /admin/notifications/templates with admin returns 200 and array of templates', async () => {
      const res = await request(basePath())
        .get('/admin/notifications/templates')
        .set(adminAuthHeader())
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(Array.isArray(data)).toBe(true);
    });

    it('POST /admin/notifications/templates creates template and returns 201 with id and name', async () => {
      const payload = {
        name: 'e2e_template_1',
        eventType: 'E2E_TEST_EVENT',
        channels: { title: 'E2E Title', message: 'E2E message' },
      };

      const res = await request(basePath())
        .post('/admin/notifications/templates')
        .set(adminAuthHeader())
        .send(payload)
        .expect(201);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.id).toBeDefined();
      expect(data?.name).toBe(payload.name);
      expect(data?.eventType).toBe(payload.eventType);
    });

    it('PATCH /admin/notifications/templates/:id updates template and returns 200', async () => {
      const createRes = await request(basePath())
        .post('/admin/notifications/templates')
        .set(adminAuthHeader())
        .send({
          name: 'e2e_template_patch',
          eventType: 'E2E_PATCH_EVENT',
          channels: { title: 'Original', message: 'Msg' },
        })
        .expect(201);

      const id = (createRes.body?.data ?? createRes.body)?.id;
      expect(id).toBeDefined();

      const res = await request(basePath())
        .patch(`/admin/notifications/templates/${id}`)
        .set(adminAuthHeader())
        .send({
          name: 'e2e_template_patch_updated',
          channels: { title: 'Updated Title', message: 'Updated' },
        })
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.id).toBe(id);
      expect(data?.name).toBe('e2e_template_patch_updated');
    });

    it('DELETE /admin/notifications/templates/:id returns 200 for existing template', async () => {
      const createRes = await request(basePath())
        .post('/admin/notifications/templates')
        .set(adminAuthHeader())
        .send({
          name: 'e2e_template_delete',
          eventType: 'E2E_DELETE_EVENT',
          channels: { title: 'T', message: 'M' },
        })
        .expect(201);

      const id = (createRes.body?.data ?? createRes.body)?.id;
      expect(id).toBeDefined();

      const res = await request(basePath())
        .delete(`/admin/notifications/templates/${id}`)
        .set(adminAuthHeader())
        .expect(200);

      expect(res.status).toBe(200);
      expect(res.body?.status).toBe('success');
    });

    it('PATCH /admin/notifications/templates/:id for non-existent id returns 404', async () => {
      const res = await request(basePath())
        .patch('/admin/notifications/templates/00000000-0000-0000-0000-000000000000')
        .set(adminAuthHeader())
        .send({ name: 'Noop' })
        .expect(404);

      expect(res.body?.status).toBe('error');
    });
  });

  describe('Internal - Trigger notification', () => {
    it('POST /internal/notifications/trigger without token returns 401', async () => {
      const res = await request(basePath())
        .post('/internal/notifications/trigger')
        .send({
          recipientIds: ['user-1'],
          title: 'Internal',
          message: 'Message',
        })
        .expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('POST /internal/notifications/trigger with valid token returns 201 and queued count', async () => {
      const payload = {
        recipientIds: ['e2e-internal-trigger-1'],
        title: 'E2E Internal Trigger',
        message: 'Triggered from E2E.',
        type: 'system.e2e',
      };

      const res = await request(basePath())
        .post('/internal/notifications/trigger')
        .set(authHeader('e2e-internal-caller-1'))
        .send(payload)
        .expect(201);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.queued).toBe(payload.recipientIds.length);
    });
  });
});
