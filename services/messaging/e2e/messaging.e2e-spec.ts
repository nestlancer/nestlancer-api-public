import request from 'supertest';
import { createTestJwt } from '../../../libs/testing/src/helpers/test-auth.helper';
import {
  setupApp,
  teardownApp,
  getAppUrl,
  getGlobalPrefix,
  E2E_USER_ID,
  E2E_ADMIN_ID,
  E2E_PROJECT_ID,
} from './setup';

const prefix = getGlobalPrefix();
const basePath = () => `${getAppUrl()}/${prefix}`.replace(/\/+$/, '');

function authHeader(userId: string, role = 'USER') {
  const token = createTestJwt(
    { sub: userId, email: `${userId}@test.com`, role },
    { secret: process.env.JWT_ACCESS_SECRET },
  );
  return { Authorization: `Bearer ${token}` };
}

describe('Messaging Service - Messages (E2E)', () => {
  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  describe('Health (smoke)', () => {
    it('GET /messages/health without token returns 200 (public health)', async () => {
      const res = await request(basePath()).get('/messages/health').expect(200);
      expect(res.body?.status).toBe('success');
      expect(res.body?.data?.status).toBe('ok');
      expect(res.body?.data?.service).toBe('messages');
    });

    it('GET /messages/health with valid token returns 200 and ok status', async () => {
      const res = await request(basePath())
        .get('/messages/health')
        .set(authHeader('e2e-messaging-health-1'))
        .expect(200);
      expect(res.body?.status).toBe('success');
      expect(res.body?.data?.status).toBe('ok');
      expect(res.body?.data?.service).toBe('messages');
    });
  });

  describe('Auth guards', () => {
    it('GET /messages/unread-count without token returns 401 error', async () => {
      const res = await request(basePath()).get('/messages/unread-count').expect(401);
      expect(res.status).toBe(401);
      expect(res.body?.status).toBe('error');
    });

    it('GET /messages/search without token returns 401 error', async () => {
      const res = await request(basePath()).get('/messages/search?q=test').expect(401);
      expect(res.status).toBe(401);
      expect(res.body?.status).toBe('error');
    });
  });

  describe('Conversations', () => {
    it('GET /conversations without token returns 401', async () => {
      const res = await request(basePath()).get('/conversations').expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('GET /conversations with valid token returns 200 and items/meta', async () => {
      const res = await request(basePath())
        .get('/conversations')
        .set(authHeader(E2E_USER_ID))
        .expect(200);
      expect(res.body?.status).toBe('success');
      expect(Array.isArray(res.body?.items)).toBe(true);
      expect(res.body?.meta).toBeDefined();
      expect(typeof res.body.meta.total).toBe('number');
    });

    it('GET /conversations/unread-count without token returns 401', async () => {
      const res = await request(basePath()).get('/conversations/unread-count').expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('GET /conversations/unread-count with valid token returns 200 and data', async () => {
      const res = await request(basePath())
        .get('/conversations/unread-count')
        .set(authHeader(E2E_USER_ID))
        .expect(200);
      expect(res.body?.status).toBe('success');
      expect(res.body?.data).toBeDefined();
    });
  });

  describe('Unread count and search (E2E)', () => {
    it('GET /messages/unread-count with valid token returns 200 and numeric totalUnread', async () => {
      const res = await request(basePath())
        .get('/messages/unread-count')
        .set(authHeader(E2E_USER_ID))
        .expect(200);
      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(typeof data?.totalUnread).toBe('number');
    });

    it('GET /messages/search with query returns 200 and items/meta structure', async () => {
      const res = await request(basePath())
        .get('/messages/search')
        .query({ q: 'test', page: 1 })
        .set(authHeader(E2E_USER_ID))
        .expect(200);
      expect(res.body?.status).toBe('success');
      const payload = res.body;
      expect(Array.isArray(payload?.items)).toBe(true);
      expect(payload?.meta).toBeDefined();
      expect(typeof payload.meta.total).toBe('number');
      expect(payload.meta.page).toBe(1);
    });
  });

  describe('Project messages and attachments (E2E)', () => {
    const projectId = E2E_PROJECT_ID;

    it('GET /messages/project/:projectId returns 200 with items and pagination meta', async () => {
      const res = await request(basePath())
        .get(`/messages/project/${projectId}`)
        .set(authHeader(E2E_USER_ID))
        .expect(200);
      expect(res.body?.status).toBe('success');
      expect(Array.isArray(res.body?.items)).toBe(true);
      expect(res.body?.meta).toBeDefined();
      expect(typeof res.body.meta.total).toBe('number');
      expect(typeof res.body.meta.limit).toBe('number');
      expect(typeof res.body.meta.totalPages).toBe('number');
    });

    it('GET /messages/projects/:projectId returns 200 with items and meta (alias)', async () => {
      const res = await request(basePath())
        .get(`/messages/projects/${projectId}`)
        .set(authHeader(E2E_USER_ID))
        .expect(200);
      expect(res.body?.status).toBe('success');
      expect(Array.isArray(res.body?.items)).toBe(true);
      expect(res.body?.meta).toBeDefined();
    });

    it('GET /messages/project/:projectId/search returns 200 and items/meta', async () => {
      const res = await request(basePath())
        .get(`/messages/project/${projectId}/search`)
        .query({ q: 'hello', page: 1 })
        .set(authHeader(E2E_USER_ID))
        .expect(200);
      expect(res.body?.status).toBe('success');
      expect(Array.isArray(res.body?.items)).toBe(true);
      expect(res.body?.meta).toBeDefined();
    });

    it('GET /messages/project/:projectId/attachments returns 200 and attachments array', async () => {
      const res = await request(basePath())
        .get(`/messages/project/${projectId}/attachments`)
        .set(authHeader(E2E_USER_ID))
        .expect(200);
      expect(res.body?.status).toBe('success');
      expect(res.body?.projectId).toBe(projectId);
      expect(Array.isArray(res.body?.attachments)).toBe(true);
    });
  });

  describe('POST /messages and POST /messages/projects/:projectId', () => {
    it('POST /messages without token returns 401', async () => {
      const res = await request(basePath())
        .post('/messages')
        .send({ projectId: E2E_PROJECT_ID, content: 'Hi' })
        .expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('POST /messages with missing projectId returns 400 validation error', async () => {
      const res = await request(basePath())
        .post('/messages')
        .set(authHeader(E2E_USER_ID))
        .send({ content: 'Hi' })
        .expect(400);
      expect(res.body?.status).toBe('error');
    });

    it('POST /messages with valid payload returns 201 and body with id, content, projectId', async () => {
      const res = await request(basePath())
        .post('/messages')
        .set(authHeader(E2E_USER_ID))
        .send({ projectId: E2E_PROJECT_ID, content: 'E2E test message' })
        .expect(201);
      expect(res.body?.status).toBe('success');
      expect(res.body?.data?.id).toBeDefined();
      expect(res.body?.data?.content).toBe('E2E test message');
      expect(res.body?.data?.projectId).toBe(E2E_PROJECT_ID);
      expect(res.body?.data?.senderId).toBe(E2E_USER_ID);
    });

    it('POST /messages/projects/:projectId without token returns 401', async () => {
      const res = await request(basePath())
        .post(`/messages/projects/${E2E_PROJECT_ID}`)
        .send({ content: 'Hi' })
        .expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('POST /messages/projects/:projectId with valid body returns 201 and data', async () => {
      const res = await request(basePath())
        .post(`/messages/projects/${E2E_PROJECT_ID}`)
        .set(authHeader(E2E_USER_ID))
        .send({ content: 'E2E project-scoped message' })
        .expect(201);
      expect(res.body?.status).toBe('success');
      expect(res.body?.data?.id).toBeDefined();
      expect(res.body?.data?.projectId).toBe(E2E_PROJECT_ID);
      expect(res.body?.data?.content).toBe('E2E project-scoped message');
    });
  });

  describe('Message update and delete (E2E)', () => {
    const missingMessageId = '00000000-0000-0000-0000-000000000099';

    it('PATCH /messages/:id for non-existent message returns 404 with error payload', async () => {
      const res = await request(basePath())
        .patch(`/messages/${missingMessageId}`)
        .set(authHeader(E2E_USER_ID))
        .send({ content: 'Updated content from E2E' })
        .expect(404);
      expect(res.body?.status).toBe('error');
      expect(typeof res.body?.error?.message).toBe('string');
    });

    it('DELETE /messages/:id for non-existent message returns 404 with error payload', async () => {
      const res = await request(basePath())
        .delete(`/messages/${missingMessageId}`)
        .set(authHeader(E2E_USER_ID))
        .expect(404);
      expect(res.body?.status).toBe('error');
      expect(typeof res.body?.error?.message).toBe('string');
    });

    it('PATCH /messages/:id with own message returns 200 and updated content', async () => {
      const createRes = await request(basePath())
        .post(`/messages/projects/${E2E_PROJECT_ID}`)
        .set(authHeader(E2E_USER_ID))
        .send({ content: 'Original E2E edit test' })
        .expect(201);
      const messageId = createRes.body?.data?.id;
      expect(messageId).toBeDefined();

      const res = await request(basePath())
        .patch(`/messages/${messageId}`)
        .set(authHeader(E2E_USER_ID))
        .send({ content: 'Updated E2E content' })
        .expect(200);
      expect(res.body?.status).toBe('success');
      expect(res.body?.data?.content).toBe('Updated E2E content');
      expect(res.body?.data?.id).toBe(messageId);
    });

    it('DELETE /messages/:id with own message returns 200', async () => {
      const createRes = await request(basePath())
        .post(`/messages/projects/${E2E_PROJECT_ID}`)
        .set(authHeader(E2E_USER_ID))
        .send({ content: 'Message to delete E2E' })
        .expect(201);
      const messageId = createRes.body?.data?.id;
      expect(messageId).toBeDefined();

      const res = await request(basePath())
        .delete(`/messages/${messageId}`)
        .set(authHeader(E2E_USER_ID))
        .expect(200);
      expect(res.body?.status).toBe('success');
    });
  });

  describe('Read (E2E)', () => {
    const missingMessageId = '00000000-0000-0000-0000-000000000099';

    it('POST /messages/:id/read without token returns 401', async () => {
      const res = await request(basePath()).post(`/messages/${missingMessageId}/read`).expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('POST /messages/:id/read for non-existent message returns 404', async () => {
      const res = await request(basePath())
        .post(`/messages/${missingMessageId}/read`)
        .set(authHeader(E2E_USER_ID))
        .expect(404);
      expect(res.body?.status).toBe('error');
    });

    it('POST /messages/project/:projectId/read with valid token returns 200', async () => {
      const res = await request(basePath())
        .post(`/messages/project/${E2E_PROJECT_ID}/read`)
        .set(authHeader(E2E_USER_ID))
        .expect(200);
      expect(res.body?.status).toBe('success');
    });

    it('POST /messages/projects/:projectId/read-all with valid token returns 200', async () => {
      const res = await request(basePath())
        .post(`/messages/projects/${E2E_PROJECT_ID}/read-all`)
        .set(authHeader(E2E_USER_ID))
        .expect(200);
      expect(res.body?.status).toBe('success');
    });

    it('POST /messages/:id/read with valid token and existing message returns 200', async () => {
      const createRes = await request(basePath())
        .post(`/messages/projects/${E2E_PROJECT_ID}`)
        .set(authHeader(E2E_USER_ID))
        .send({ content: 'Message for read E2E' })
        .expect(201);
      const messageId = createRes.body?.data?.id;
      expect(messageId).toBeDefined();

      const res = await request(basePath())
        .post(`/messages/${messageId}/read`)
        .set(authHeader(E2E_USER_ID))
        .expect(200);
      expect(res.body?.status).toBe('success');
    });
  });

  describe('Pin / Unpin (E2E)', () => {
    const missingMessageId = '00000000-0000-0000-0000-000000000099';

    it('POST /messages/:id/pin without token returns 401', async () => {
      const res = await request(basePath()).post(`/messages/${missingMessageId}/pin`).expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('POST /messages/:id/unpin without token returns 401', async () => {
      const res = await request(basePath()).post(`/messages/${missingMessageId}/unpin`).expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('POST /messages/:id/pin then POST /messages/:id/unpin with existing message return 200', async () => {
      const createRes = await request(basePath())
        .post(`/messages/projects/${E2E_PROJECT_ID}`)
        .set(authHeader(E2E_USER_ID))
        .send({ content: 'Message for pin E2E' })
        .expect(201);
      const messageId = createRes.body?.data?.id;
      expect(messageId).toBeDefined();

      const pinRes = await request(basePath())
        .post(`/messages/${messageId}/pin`)
        .set(authHeader(E2E_USER_ID))
        .expect(200);
      expect(pinRes.body?.status).toBe('success');
      expect(pinRes.body?.pinned).toBe(true);
      expect(pinRes.body?.id).toBe(messageId);

      const unpinRes = await request(basePath())
        .post(`/messages/${messageId}/unpin`)
        .set(authHeader(E2E_USER_ID))
        .expect(200);
      expect(unpinRes.body?.status).toBe('success');
      expect(unpinRes.body?.pinned).toBe(false);
    });
  });

  describe('Thread (E2E)', () => {
    const missingMessageId = '00000000-0000-0000-0000-000000000099';

    it('GET /messages/:messageId/thread without token returns 401', async () => {
      const res = await request(basePath()).get(`/messages/${missingMessageId}/thread`).expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('GET /messages/:messageId/thread with valid token returns 200 and data/pagination', async () => {
      const res = await request(basePath())
        .get(`/messages/${missingMessageId}/thread`)
        .set(authHeader(E2E_USER_ID))
        .expect(200);
      expect(res.body?.status).toBe('success');
      expect(Array.isArray(res.body?.data)).toBe(true);
      expect(res.body?.pagination).toBeDefined();
    });

    it('POST /messages/:messageId/thread without token returns 401', async () => {
      const res = await request(basePath())
        .post(`/messages/${missingMessageId}/thread`)
        .send({ projectId: E2E_PROJECT_ID, content: 'Reply' })
        .expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('POST /messages/:messageId/thread with missing projectId returns 400', async () => {
      const res = await request(basePath())
        .post(`/messages/${missingMessageId}/thread`)
        .set(authHeader(E2E_USER_ID))
        .send({ content: 'Reply' })
        .expect(400);
      expect(res.body?.status).toBe('error');
    });

    it('POST /messages/:messageId/thread with valid payload returns 201 and reply data', async () => {
      const parentRes = await request(basePath())
        .post(`/messages/projects/${E2E_PROJECT_ID}`)
        .set(authHeader(E2E_USER_ID))
        .send({ content: 'Parent for thread E2E' })
        .expect(201);
      const parentId = parentRes.body?.data?.id;
      expect(parentId).toBeDefined();

      const res = await request(basePath())
        .post(`/messages/${parentId}/thread`)
        .set(authHeader(E2E_USER_ID))
        .send({ projectId: E2E_PROJECT_ID, content: 'Thread reply E2E', replyToId: parentId })
        .expect(201);
      expect(res.body?.status).toBe('success');
      expect(res.body?.data?.id).toBeDefined();
      expect(res.body?.data?.replyToId).toBe(parentId);
      expect(res.body?.data?.content).toBe('Thread reply E2E');
    });
  });

  describe('Message threads controller - GET /messages/:messageId/threads', () => {
    const missingMessageId = '00000000-0000-0000-0000-000000000099';

    it('GET /messages/:messageId/threads without token returns 401', async () => {
      const res = await request(basePath())
        .get(`/messages/${missingMessageId}/threads`)
        .expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('GET /messages/:messageId/threads with valid token returns 200 and items/meta', async () => {
      const res = await request(basePath())
        .get(`/messages/${missingMessageId}/threads`)
        .set(authHeader(E2E_USER_ID))
        .expect(200);
      expect(res.body?.status).toBe('success');
      expect(Array.isArray(res.body?.items)).toBe(true);
      expect(res.body?.meta).toBeDefined();
    });
  });
});

describe('Messaging Service - Admin (E2E)', () => {
  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  describe('Auth', () => {
    it('GET /admin/messages without token returns 401', async () => {
      const res = await request(basePath()).get('/admin/messages').expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('GET /admin/messages with USER role returns 403', async () => {
      const res = await request(basePath())
        .get('/admin/messages')
        .set(authHeader(E2E_USER_ID, 'USER'))
        .expect(403);
      expect(res.body?.status).toBe('error');
    });
  });

  describe('Admin - List and stats', () => {
    it('GET /admin/messages with ADMIN returns 200 and items/meta', async () => {
      const res = await request(basePath())
        .get('/admin/messages')
        .set(authHeader(E2E_ADMIN_ID, 'ADMIN'))
        .expect(200);
      expect(res.body?.status).toBe('success');
      expect(Array.isArray(res.body?.items)).toBe(true);
      expect(res.body?.meta).toBeDefined();
      expect(typeof res.body.meta.total).toBe('number');
    });

    it('GET /admin/messages/stats with ADMIN returns 200 and totalMessages, activeChats', async () => {
      const res = await request(basePath())
        .get('/admin/messages/stats')
        .set(authHeader(E2E_ADMIN_ID, 'ADMIN'))
        .expect(200);
      expect(res.body?.status).toBe('success');
      expect(typeof res.body?.totalMessages).toBe('number');
      expect(typeof res.body?.activeChats).toBe('number');
    });

    it('GET /admin/messages/analytics with ADMIN returns 200', async () => {
      const res = await request(basePath())
        .get('/admin/messages/analytics')
        .set(authHeader(E2E_ADMIN_ID, 'ADMIN'))
        .expect(200);
      expect(res.body?.status).toBe('success');
    });

    it('GET /admin/messages/conversations with ADMIN returns 200 and data/pagination', async () => {
      const res = await request(basePath())
        .get('/admin/messages/conversations')
        .set(authHeader(E2E_ADMIN_ID, 'ADMIN'))
        .expect(200);
      expect(res.body?.status).toBe('success');
      expect(Array.isArray(res.body?.data)).toBe(true);
      expect(res.body?.pagination).toBeDefined();
    });

    it('GET /admin/messages/project/:projectId with ADMIN returns 200 and projectId, messages', async () => {
      const res = await request(basePath())
        .get(`/admin/messages/project/${E2E_PROJECT_ID}`)
        .set(authHeader(E2E_ADMIN_ID, 'ADMIN'))
        .expect(200);
      expect(res.body?.status).toBe('success');
      expect(res.body?.projectId).toBe(E2E_PROJECT_ID);
      expect(Array.isArray(res.body?.messages)).toBe(true);
    });

    it('GET /admin/messages/flagged with ADMIN returns 200 and data array', async () => {
      const res = await request(basePath())
        .get('/admin/messages/flagged')
        .set(authHeader(E2E_ADMIN_ID, 'ADMIN'))
        .expect(200);
      expect(res.body?.status).toBe('success');
      expect(Array.isArray(res.body?.data)).toBe(true);
    });
  });

  describe('Admin - System message and flag', () => {
    it('POST /admin/messages/projects/:projectId/system with ADMIN returns 200 and data with messageId', async () => {
      const res = await request(basePath())
        .post(`/admin/messages/projects/${E2E_PROJECT_ID}/system`)
        .set(authHeader(E2E_ADMIN_ID, 'ADMIN'))
        .send({ content: 'E2E system notification' })
        .expect(200);
      expect(res.body?.status).toBe('success');
      expect(res.body?.data?.projectId).toBe(E2E_PROJECT_ID);
      expect(res.body?.data?.messageId).toBeDefined();
      expect(res.body?.data?.sent).toBe(true);
    });

    it('POST /admin/messages/:id/flag for non-existent id returns error status', async () => {
      const res = await request(basePath())
        .post('/admin/messages/00000000-0000-0000-0000-000000000099/flag')
        .set(authHeader(E2E_ADMIN_ID, 'ADMIN'));
      expect([404, 500]).toContain(res.status);
      expect(res.body?.status).toBe('error');
    });

    it('POST /admin/messages/:id/flag for existing message returns 200 and flagged true', async () => {
      const createRes = await request(basePath())
        .post(`/messages/projects/${E2E_PROJECT_ID}`)
        .set(authHeader(E2E_USER_ID))
        .send({ content: 'Message for admin flag E2E' })
        .expect(201);
      const messageId = createRes.body?.data?.id;
      expect(messageId).toBeDefined();

      const res = await request(basePath())
        .post(`/admin/messages/${messageId}/flag`)
        .set(authHeader(E2E_ADMIN_ID, 'ADMIN'))
        .expect(200);
      expect(res.body?.status).toBe('success');
      expect(res.body?.id).toBe(messageId);
      expect(res.body?.flagged).toBe(true);
    });
  });

  describe('Admin - Delete message', () => {
    it('DELETE /admin/messages/:id for non-existent id returns error status', async () => {
      const res = await request(basePath())
        .delete('/admin/messages/00000000-0000-0000-0000-000000000099')
        .set(authHeader(E2E_ADMIN_ID, 'ADMIN'));
      expect([404, 500]).toContain(res.status);
      expect(res.body?.status).toBe('error');
    });

    it('DELETE /admin/messages/:id for existing message returns 200', async () => {
      const createRes = await request(basePath())
        .post(`/messages/projects/${E2E_PROJECT_ID}`)
        .set(authHeader(E2E_USER_ID))
        .send({ content: 'Message for admin delete E2E' })
        .expect(201);
      const messageId = createRes.body?.data?.id;
      expect(messageId).toBeDefined();

      const res = await request(basePath())
        .delete(`/admin/messages/${messageId}`)
        .set(authHeader(E2E_ADMIN_ID, 'ADMIN'))
        .expect(200);
      expect(res.body?.status).toBe('success');
    });
  });
});
