import request from 'supertest';
import { ContactSubject } from '@nestlancer/common';
import { createTestJwt } from '../../../libs/testing/src/helpers/test-auth.helper';
import {
  setupApp,
  teardownApp,
  getApp,
  getAppUrl,
  getGlobalPrefix,
  getTestPrismaClientForE2E,
} from './setup';

const prefix = getGlobalPrefix();
const pathPrefix = `/${prefix}`;

function authHeader(userId: string, role: 'USER' | 'ADMIN' = 'USER') {
  const token = createTestJwt(
    { sub: userId, email: `${userId}@test.com`, role },
    { secret: process.env.JWT_ACCESS_SECRET },
  );
  return { Authorization: `Bearer ${token}` };
}

const validPayload = {
  name: 'Jane Smith',
  email: 'jane@example.com',
  subject: ContactSubject.GENERAL,
  message: 'This is a valid message with enough length for validation.',
  turnstileToken: 'e2e-test-turnstile-token',
};

describe('Contact Service - Feature (E2E)', () => {
  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  describe('Health (smoke)', () => {
    it('GET /contact/health returns 200 and contact service status envelope', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`${pathPrefix}/contact/health`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data?.status).toBe('healthy');
      expect(res.body.data?.service).toBe('contact');
    });
  });

  describe('Public contact submission', () => {
    it('POST /contact returns 201 and body with ticketId and subject when payload is valid', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`${pathPrefix}/contact`)
        .send(validPayload)
        .expect(201);

      expect(res.body.status).toBe('success');
      const payload = res.body.data;
      expect(payload?.message ?? res.body.message).toBe(
        "Your message has been received. We'll be in touch soon.",
      );
      const created = payload?.data ?? payload;
      expect(created?.ticketId).toBeDefined();
      expect(typeof created?.ticketId).toBe('string');
      expect(created?.ticketId).toMatch(/^TKT-/);
      if (created?.subject !== undefined) {
        expect(created.subject).toBe(ContactSubject.GENERAL);
      }
    });

    it('POST /contact without body returns 400 or 422 with error envelope', async () => {
      const res = await request(getApp().getHttpServer()).post(`${pathPrefix}/contact`).send({});

      expect([400, 422]).toContain(res.status);
      expect(res.body.status).toBe('error');
      expect(res.body.message ?? res.body.error).toBeDefined();
    });

    it('POST /contact with invalid email returns 422', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`${pathPrefix}/contact`)
        .send({
          ...validPayload,
          email: 'not-an-email',
        })
        .expect(400);

      expect(res.body.status).toBe('error');
    });

    it('POST /contact with message too short returns 400', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`${pathPrefix}/contact`)
        .send({
          ...validPayload,
          message: 'short',
        })
        .expect(400);

      expect(res.body.status).toBe('error');
    });

    it('POST /contact with invalid subject returns 400', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`${pathPrefix}/contact`)
        .send({
          ...validPayload,
          subject: 'INVALID_SUBJECT',
        })
        .expect(400);

      expect(res.body.status).toBe('error');
    });
  });

  describe('Admin contact endpoints - auth', () => {
    it('GET /admin/contact without token returns 401', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`${pathPrefix}/admin/contact`)
        .query({ page: 1, limit: 10 })
        .expect(401);

      expect(res.body.status).toBe('error');
    });

    it('GET /admin/contact with USER role returns 403', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`${pathPrefix}/admin/contact`)
        .query({ page: 1, limit: 10 })
        .set(authHeader('e2e-user-1', 'USER'))
        .expect(403);

      expect(res.body.status).toBe('error');
    });
  });

  describe('Admin contact endpoints - list and get', () => {
    it('GET /admin/contact with ADMIN token returns 200 and list shape with pagination', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`${pathPrefix}/admin/contact`)
        .query({ page: 1, limit: 10 })
        .set(authHeader('e2e-admin-1', 'ADMIN'))
        .expect(200);

      expect(res.body.status).toBe('success');
      const list = res.body.data?.data ?? res.body.data;
      expect(Array.isArray(list)).toBe(true);
      const pagination = res.body.data?.pagination ?? res.body.pagination;
      expect(pagination).toBeDefined();
      expect(pagination.page).toBe(1);
      expect(pagination.limit).toBe(10);
      expect(typeof pagination.total).toBe('number');
      expect(typeof pagination.totalPages).toBe('number');
    });

    it('GET /admin/contact/:id for non-existent id returns 404', async () => {
      const fakeId = '00000000-0000-4000-8000-000000000000';
      const res = await request(getApp().getHttpServer())
        .get(`${pathPrefix}/admin/contact/${fakeId}`)
        .set(authHeader('e2e-admin-1', 'ADMIN'))
        .expect(404);

      expect(res.body.status).toBe('error');
    });

    it('GET /admin/contact/:id returns 200 and full message when id exists', async () => {
      // Create a message via public POST so we have a real id
      const createRes = await request(getApp().getHttpServer())
        .post(`${pathPrefix}/contact`)
        .send({
          ...validPayload,
          name: 'Admin Get Test',
          email: 'admin-get@example.com',
          message: 'Message for admin get by id E2E test.',
        })
        .expect(201);

      const created = createRes.body.data?.data ?? createRes.body.data;
      expect(created?.ticketId).toBeDefined();
      const ticketId = created.ticketId;

      const prisma = getTestPrismaClientForE2E();
      const message = prisma
        ? await prisma.contactMessage.findUnique({ where: { ticketId } })
        : null;
      if (!message) {
        throw new Error('Contact message was not created; cannot test GET by id.');
      }

      const res = await request(getApp().getHttpServer())
        .get(`${pathPrefix}/admin/contact/${message.id}`)
        .set(authHeader('e2e-admin-1', 'ADMIN'))
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data?.id).toBe(message.id);
      expect(res.body.data?.ticketId).toBe(ticketId);
      expect(res.body.data?.name).toBe('Admin Get Test');
      expect(res.body.data?.email).toBe('admin-get@example.com');
      expect(res.body.data?.subject).toBe(ContactSubject.GENERAL);
      expect(res.body.data?.message).toBeDefined();
      expect(res.body.data?.status).toBeDefined();
      expect(res.body.data?.createdAt).toBeDefined();
    });
  });

  describe('Admin contact endpoints - update status and respond', () => {
    let createdContactId: string;

    beforeAll(async () => {
      const createRes = await request(getApp().getHttpServer())
        .post(`${pathPrefix}/contact`)
        .send({
          ...validPayload,
          name: 'Status Test User',
          email: 'status-test@example.com',
          message: 'Message for status and respond E2E tests.',
        })
        .expect(201);

      const prisma = getTestPrismaClientForE2E();
      const created = createRes.body.data?.data ?? createRes.body.data;
      const ticketId = created?.ticketId;
      if (!prisma || !ticketId) {
        throw new Error('Setup: contact message not created.');
      }
      const msg = await prisma.contactMessage.findUnique({ where: { ticketId } });
      if (!msg) throw new Error('Setup: contact message not found.');
      createdContactId = msg.id;
    });

    it('PATCH /admin/contact/:id/status returns 200 and updated status', async () => {
      const res = await request(getApp().getHttpServer())
        .patch(`${pathPrefix}/admin/contact/${createdContactId}/status`)
        .set(authHeader('e2e-admin-1', 'ADMIN'))
        .send({ status: 'READ' })
        .expect(200);

      expect(res.body.status).toBe('success');
      const payload = res.body.data?.data ?? res.body.data;
      expect(payload?.status).toBe('READ');
    });

    it('POST /admin/contact/:id/respond returns 201 and response data', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`${pathPrefix}/admin/contact/${createdContactId}/respond`)
        .set(authHeader('e2e-admin-1', 'ADMIN'))
        .send({
          subject: 'Re: Your inquiry',
          message: 'Thank you for your message. We will get back to you.',
          markAsResponded: true,
        })
        .expect(201);

      expect(res.body.status).toBe('success');
      const payload = res.body.data?.data ?? res.body.data;
      expect(res.body.data?.message ?? res.body.message).toBe('Response sent successfully');
      expect(payload?.id).toBeDefined();
      expect(payload?.contactMessageId).toBe(createdContactId);
      expect(payload?.subject).toBe('Re: Your inquiry');
      expect(payload?.sentAt).toBeDefined();
    });
  });

  describe('Admin contact endpoints - spam and delete', () => {
    let spamTestContactId: string;
    let deleteTestContactId: string;

    beforeAll(async () => {
      const prisma = getTestPrismaClientForE2E();
      if (!prisma) return;

      const [spamRes, delRes] = await Promise.all([
        request(getApp().getHttpServer())
          .post(`${pathPrefix}/contact`)
          .send({
            ...validPayload,
            name: 'Spam Test',
            email: 'spam-test@example.com',
            message: 'Message for spam E2E test.',
          }),
        request(getApp().getHttpServer())
          .post(`${pathPrefix}/contact`)
          .send({
            ...validPayload,
            name: 'Delete Test',
            email: 'delete-test@example.com',
            message: 'Message for delete E2E test.',
          }),
      ]);

      const spamTicketId = (spamRes.body.data?.data ?? spamRes.body.data)?.ticketId;
      const delTicketId = (delRes.body.data?.data ?? delRes.body.data)?.ticketId;
      if (spamRes.status !== 201 || delRes.status !== 201 || !spamTicketId || !delTicketId) {
        throw new Error('Setup: failed to create contact messages for spam/delete tests.');
      }

      const spamMsg = await prisma.contactMessage.findUnique({
        where: { ticketId: spamTicketId },
      });
      const delMsg = await prisma.contactMessage.findUnique({
        where: { ticketId: delTicketId },
      });
      if (!spamMsg || !delMsg) throw new Error('Setup: contact messages not found.');
      spamTestContactId = spamMsg.id;
      deleteTestContactId = delMsg.id;
    });

    it('POST /admin/contact/:id/spam returns 201', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`${pathPrefix}/admin/contact/${spamTestContactId}/spam`)
        .set(authHeader('e2e-admin-1', 'ADMIN'))
        .expect(201);

      expect(res.body.status).toBe('success');
    });

    it('DELETE /admin/contact/:id returns 200 and confirmation', async () => {
      const res = await request(getApp().getHttpServer())
        .delete(`${pathPrefix}/admin/contact/${deleteTestContactId}`)
        .set(authHeader('e2e-admin-1', 'ADMIN'))
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(
        res.body.data?.message ?? res.body.message ?? res.body.data?.data?.message,
      ).toBeDefined();
    });

    it('GET /admin/contact/:id for deleted (archived) message still returns 200 with data', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`${pathPrefix}/admin/contact/${deleteTestContactId}`)
        .set(authHeader('e2e-admin-1', 'ADMIN'))
        .expect(200);

      expect(res.body.status).toBe('success');
      const payload = res.body.data?.data ?? res.body.data;
      expect(payload?.id).toBe(deleteTestContactId);
      expect(payload?.status).toBe('ARCHIVED');
    });
  });
});
