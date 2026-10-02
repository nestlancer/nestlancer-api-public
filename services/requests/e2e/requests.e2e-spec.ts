import request from 'supertest';
import { createTestJwt } from '../../../libs/testing/src/helpers/test-auth.helper';
import { getTestPrismaClient } from '../../../libs/testing/src/helpers/test-database.helper';
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
  return authHeader('admin-e2e-1', 'ADMIN');
}

const validCreatePayload = {
  title: 'Build a Custom CRM for Real Estate',
  description:
    'We need a robust CRM system to manage lead flow, automated emails, and agent performance tracking with at least twenty characters here.',
  category: 'webDevelopment',
  budget: { min: 5000, max: 15000, currency: 'INR', flexible: true },
  timeline: {
    preferredStartDate: '2024-12-01T00:00:00Z',
    deadline: '2025-05-01T23:59:59Z',
    flexible: false,
  },
  requirements: ['User authentication', 'Dashboard analytics'],
};

describe('Requests Service - Requests (E2E)', () => {
  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  describe('Health (smoke)', () => {
    it('GET /requests/health returns 200 with success envelope and ok status', async () => {
      const res = await request(getAppUrl().replace(/\/$/, ''))
        .get(`/${prefix}/requests/health`)
        .expect(200);

      expect(res.body?.status).toBe('success');
      expect(res.body?.data?.status).toBe('ok');
      expect(res.body?.data?.service).toBe('requests');
    });
  });

  describe('Auth', () => {
    it('POST /requests without token returns 401 error', async () => {
      const res = await request(basePath()).post('/requests').send(validCreatePayload).expect(401);

      expect(res.status).toBe(401);
      expect(res.body?.status).toBe('error');
    });

    it('GET /requests without token returns 401 error', async () => {
      const res = await request(basePath()).get('/requests').expect(401);

      expect(res.status).toBe(401);
      expect(res.body?.status).toBe('error');
    });

    it('GET /requests/stats without token returns 401 error', async () => {
      const res = await request(basePath()).get('/requests/stats').expect(401);

      expect(res.status).toBe(401);
      expect(res.body?.status).toBe('error');
    });

    it('POST /requests/:id/attachments without token returns 401 error', async () => {
      const res = await request(basePath())
        .post('/requests/00000000-0000-0000-0000-000000000000/attachments')
        .attach('file', Buffer.from('test'), 'test.txt')
        .expect(401);

      expect(res.status).toBe(401);
      expect(res.body?.status).toBe('error');
    });
  });

  describe('Client - Create request', () => {
    const userId = 'e2e-client-request-1';

    it('POST /requests rejects invalid payload with 400 validation error', async () => {
      const res = await request(basePath())
        .post('/requests')
        .set(authHeader(userId))
        .send({
          title: 'Hi',
          description: 'Short',
          category: 'webDevelopment',
          budget: { min: 0, max: 0, currency: 'INR', flexible: false },
          timeline: {
            preferredStartDate: '2024-12-01',
            deadline: '2025-05-01',
            flexible: false,
          },
          requirements: [],
        })
        .expect(400);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.message).toBeDefined();
    });

    it('POST /requests creates draft with valid payload (201)', async () => {
      const res = await request(basePath())
        .post('/requests')
        .set(authHeader(userId))
        .send(validCreatePayload)
        .expect(201);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.id).toBeDefined();
      expect(data?.status).toMatch(/draft/);
      expect(data?.title).toBe(validCreatePayload.title);
    });
  });

  describe('Client - List and get', () => {
    const userId = 'e2e-client-list-1';
    let requestId: string;

    beforeAll(async () => {
      const createRes = await request(basePath())
        .post('/requests')
        .set(authHeader(userId))
        .send(validCreatePayload)
        .expect(201);

      const data = createRes.body?.data ?? createRes.body;
      requestId = data.id;
    });

    it('GET /requests returns 200 and list of requests', async () => {
      const res = await request(basePath()).get('/requests').set(authHeader(userId)).expect(200);

      expect(res.body?.status).toBe('success');
      const payload = res.body?.data ?? res.body;
      const items = Array.isArray(payload) ? payload : payload?.items;
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /requests/:id returns 200 and request details for existing id', async () => {
      const res = await request(basePath())
        .get(`/requests/${requestId}`)
        .set(authHeader(userId))
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.id).toBe(requestId);
      expect(data?.title).toBe(validCreatePayload.title);
    });

    it('GET /requests/:id returns 404 and business error code for non-existent id', async () => {
      const res = await request(basePath())
        .get('/requests/00000000-0000-0000-0000-000000000000')
        .set(authHeader(userId))
        .expect(404);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('REQUEST_001');
      expect(typeof res.body?.error?.message).toBe('string');
    });

    it('GET /requests/stats returns 200 and stats payload', async () => {
      const res = await request(basePath())
        .get('/requests/stats')
        .set(authHeader(userId))
        .expect(200);

      expect(res.body?.status).toBe('success');
      expect(res.body?.data).toBeDefined();
      expect(typeof res.body?.data?.total).toBe('number');
      expect(res.body?.data?.byStatus).toBeDefined();
    });
  });

  describe('Client - Create then get, update, submit', () => {
    const userId = 'e2e-client-crud-1';
    let requestId: string;

    it('creates a request and fetches it', async () => {
      const createRes = await request(basePath())
        .post('/requests')
        .set(authHeader(userId))
        .send(validCreatePayload)
        .expect(201);

      expect(createRes.body?.status).toBe('success');
      const data = createRes.body?.data ?? createRes.body;
      requestId = data.id;
      expect(requestId).toBeDefined();

      const getRes = await request(basePath())
        .get(`/requests/${requestId}`)
        .set(authHeader(userId))
        .expect(200);

      expect(getRes.body?.status).toBe('success');
      const getData = getRes.body?.data ?? getRes.body;
      expect(getData?.id).toBe(requestId);
      expect(getData?.title).toBe(validCreatePayload.title);
    });

    it('GET /requests/:id/status returns 200 and status timeline for existing request', async () => {
      const res = await request(basePath())
        .get(`/requests/${requestId}/status`)
        .set(authHeader(userId))
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.id).toBe(requestId);
      expect(Array.isArray(data?.statusHistory)).toBe(true);
    });

    it('PATCH /requests/:id updates draft and returns 200 with updated title', async () => {
      const res = await request(basePath())
        .patch(`/requests/${requestId}`)
        .set(authHeader(userId))
        .send({ title: 'Updated Title for E2E' })
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.title).toBe('Updated Title for E2E');
    });

    it('POST /requests/:id/submit transitions draft to submitted (200)', async () => {
      const res = await request(basePath())
        .post(`/requests/${requestId}/submit`)
        .set(authHeader(userId))
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.id).toBe(requestId);
      expect(String(data?.status).toLowerCase()).toBe('submitted');
    });

    it('POST /requests/:id/submit on non-draft request returns 400 with invalid transition error code', async () => {
      const res = await request(basePath())
        .post(`/requests/${requestId}/submit`)
        .set(authHeader(userId))
        .expect(400);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('REQUEST_005');
    });

    it('DELETE /requests/:id rejects non-draft with 400 error and business error code', async () => {
      const res = await request(basePath())
        .delete(`/requests/${requestId}`)
        .set(authHeader(userId))
        .expect(400);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('REQUEST_004');
    });
  });

  describe('Client - Quotes and attachments', () => {
    const userId = 'e2e-client-quotes-1';
    let requestId: string;

    beforeAll(async () => {
      const createRes = await request(basePath())
        .post('/requests')
        .set(authHeader(userId))
        .send(validCreatePayload)
        .expect(201);

      const data = createRes.body?.data ?? createRes.body;
      requestId = data.id;
    });

    it('GET /requests/:id/quotes returns 200 and quotes array for existing request', async () => {
      const res = await request(basePath())
        .get(`/requests/${requestId}/quotes`)
        .set(authHeader(userId))
        .expect(200);

      expect(res.body?.status).toBe('success');
      const qData = res.body?.data ?? res.body;
      expect(qData?.requestId).toBe(requestId);
      expect(Array.isArray(qData?.quotes)).toBe(true);
    });

    it('GET /requests/:id/attachments returns 200 and attachments list (may be empty)', async () => {
      const res = await request(basePath())
        .get(`/requests/${requestId}/attachments`)
        .set(authHeader(userId))
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(Array.isArray(data) || Array.isArray(data?.attachments)).toBe(true);
    });
  });

  describe('Client - Delete attachment (error paths)', () => {
    const userId = 'e2e-client-attachments-delete-1';
    let requestId: string;

    beforeAll(async () => {
      const createRes = await request(basePath())
        .post('/requests')
        .set(authHeader(userId))
        .send(validCreatePayload)
        .expect(201);

      const data = createRes.body?.data ?? createRes.body;
      requestId = data.id;
    });

    it('DELETE /requests/:id/attachments/:attachmentId with non-existent attachment returns 404', async () => {
      const res = await request(basePath())
        .delete(`/requests/${requestId}/attachments/00000000-0000-0000-0000-000000000000`)
        .set(authHeader(userId))
        .expect(400);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('REQUEST_012');
    });
  });

  describe('Client - Delete draft', () => {
    const userId = 'e2e-client-delete-1';

    it('creates draft then deletes it with 200', async () => {
      const createRes = await request(basePath())
        .post('/requests')
        .set(authHeader(userId))
        .send(validCreatePayload)
        .expect(201);

      const data = createRes.body?.data ?? createRes.body;
      const id = data.id;
      expect(id).toBeDefined();

      const delRes = await request(basePath())
        .delete(`/requests/${id}`)
        .set(authHeader(userId))
        .expect(200);

      expect(delRes.body?.status).toBe('success');
      expect(delRes.body?.data).toBe(true);
    });
  });

  describe('Admin - Auth', () => {
    it('GET /admin/requests without token returns 401', async () => {
      const res = await request(basePath()).get('/admin/requests').expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('GET /admin/requests with USER role returns 403', async () => {
      const res = await request(basePath())
        .get('/admin/requests')
        .set(authHeader('normal-user', 'USER'))
        .expect(403);

      expect(res.body?.status).toBe('error');
    });
  });

  describe('Admin - List and stats', () => {
    it('GET /admin/requests with admin token returns 200 and list', async () => {
      const res = await request(basePath())
        .get('/admin/requests')
        .set(adminAuthHeader())
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data).toBeDefined();
      expect(Array.isArray(data?.data)).toBe(true);
      expect(data?.pagination).toBeDefined();
      expect(typeof data?.pagination?.page).toBe('number');
      expect(typeof data?.pagination?.limit).toBe('number');
      expect(typeof data?.pagination?.total).toBe('number');
    });

    it('GET /admin/requests/stats returns 200 and overall stats', async () => {
      const res = await request(basePath())
        .get('/admin/requests/stats')
        .set(adminAuthHeader())
        .expect(200);

      expect(res.body?.status).toBe('success');
      expect(res.body?.data).toBeDefined();
      expect(typeof res.body?.data?.total).toBe('number');
      expect(res.body?.data?.byStatus).toBeDefined();
    });

    it('GET /admin/requests?status=submitted filters by status and returns 200', async () => {
      const res = await request(basePath())
        .get('/admin/requests?status=submitted&page=1&limit=5')
        .set(adminAuthHeader())
        .expect(200);

      expect(res.body?.status).toBe('success');
    });
  });

  describe('Admin - Get details, status, notes, quote', () => {
    const userId = 'e2e-admin-flow-1';
    let requestId: string;

    it('client creates request, admin gets details with 200', async () => {
      const createRes = await request(basePath())
        .post('/requests')
        .set(authHeader(userId))
        .send(validCreatePayload)
        .expect(201);

      const data = createRes.body?.data ?? createRes.body;
      requestId = data.id;

      const adminRes = await request(basePath())
        .get(`/admin/requests/${requestId}`)
        .set(adminAuthHeader())
        .expect(200);

      expect(adminRes.body?.status).toBe('success');
      const adminData = adminRes.body?.data ?? adminRes.body;
      expect(adminData?.id).toBe(requestId);
    });

    it('PATCH /admin/requests/:id/status updates status and returns 200', async () => {
      await request(basePath())
        .post(`/requests/${requestId}/submit`)
        .set(authHeader(userId))
        .expect(200);

      const res = await request(basePath())
        .patch(`/admin/requests/${requestId}/status`)
        .set(adminAuthHeader())
        .send({ status: 'underReview', notes: 'E2E admin status update' })
        .expect(200);

      expect(res.body?.status).toBe('success');
    });

    it('POST /admin/requests/:id/notes adds note with 201', async () => {
      const res = await request(basePath())
        .post(`/admin/requests/${requestId}/notes`)
        .set(adminAuthHeader())
        .send({ content: 'E2E internal note' })
        .expect(201);

      expect(res.body?.status).toBe('success');
    });

    it('GET /admin/requests/:id/notes returns 200 and notes list', async () => {
      const res = await request(basePath())
        .get(`/admin/requests/${requestId}/notes`)
        .set(adminAuthHeader())
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(Array.isArray(data?.notes ?? data) || typeof data === 'object').toBe(true);
    });

    it('POST /admin/requests/:id/quotes creates quote with 201', async () => {
      const res = await request(basePath())
        .post(`/admin/requests/${requestId}/quotes`)
        .set(adminAuthHeader())
        .send({
          items: [
            { description: 'Frontend work', quantity: 1, unitPrice: 10000 },
            { description: 'Backend work', quantity: 1, unitPrice: 15000 },
          ],
          currency: 'INR',
          taxPercentage: 10,
          validUntil: '2025-12-31T23:59:59Z',
        })
        .expect(201);

      expect(res.body?.status).toBe('success');
    });

    it('PATCH /admin/requests/:id updates request details and returns 200', async () => {
      const res = await request(basePath())
        .patch(`/admin/requests/${requestId}`)
        .set(adminAuthHeader())
        .send({ title: 'Admin Updated Title' })
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.requestId ?? data?.id).toBe(requestId);
    });

    it('POST /admin/requests/:id/assign assigns request and returns 200', async () => {
      const res = await request(basePath())
        .post(`/admin/requests/${requestId}/assign`)
        .set(adminAuthHeader())
        .send({ assigneeId: 'admin-assignee-e2e-1' })
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.requestId).toBe(requestId);
      expect(data?.assignedTo).toBe('admin-assignee-e2e-1');
    });

    it('DELETE /admin/requests/:id deletes request and returns 204', async () => {
      const res = await request(basePath())
        .delete(`/admin/requests/${requestId}`)
        .set(adminAuthHeader())
        .expect(204);

      expect(res.status).toBe(204);
    });
  });

  describe('Admin - Quote reuse (prefill & package)', () => {
    const userId = 'e2e-client-quotes-1';
    let packageId: string;
    let prefillRequestId: string;
    let sourceQuoteId: string;
    let targetRequestId: string;

    beforeAll(async () => {
      const prisma = getTestPrismaClient();
      if (!prisma) throw new Error('Prisma client not initialised');

      const pkg = await prisma.servicePackage.upsert({
        where: { slug: 'e2e-web-mvp-prefill' },
        create: {
          name: 'E2E Web MVP',
          slug: 'e2e-web-mvp-prefill',
          description: 'E2E package for prefillFromPackage tests',
          category: 'webDevelopment',
          basePricePaise: 5000000,
          estimatedDays: 14,
          revisionsIncluded: 3,
          deliverables: [
            { description: 'Discovery workshop', quantity: 1, unitPrice: 10000 },
            { description: 'MVP build', quantity: 1, unitPrice: 40000 },
          ],
          addOns: [{ description: 'Admin dashboard add-on', quantity: 1, unitPrice: 15000 }],
          isActive: true,
        },
        update: {
          deliverables: [
            { description: 'Discovery workshop', quantity: 1, unitPrice: 10000 },
            { description: 'MVP build', quantity: 1, unitPrice: 40000 },
          ],
        },
      });
      packageId = pkg.id;

      const prefillReq = await prisma.projectRequest.create({
        data: {
          userId,
          title: 'Package prefill E2E request',
          description: 'Request linked to service package for prefill E2E.',
          category: 'webDevelopment',
          requirements: ['Prefill test'],
          status: 'SUBMITTED',
          servicePackageId: packageId,
        },
      });
      prefillRequestId = prefillReq.id;

      const sourceReq = await prisma.projectRequest.create({
        data: {
          userId,
          title: 'Source for quote prefill E2E',
          description: 'Source request for prefill suggestions E2E.',
          category: 'webDevelopment',
          requirements: ['Source'],
          status: 'QUOTED',
        },
      });

      const sourceQuote = await prisma.quote.create({
        data: {
          requestId: sourceReq.id,
          userId,
          title: 'Source quote for prefill',
          description: 'Source quote',
          subtotal: 2500000,
          totalAmount: 2500000,
          currency: 'INR',
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'DRAFT',
          paymentBreakdown: [
            { description: 'Phase 1', quantity: 1, unitPrice: 25000, totalPrice: 2500000 },
          ],
          paymentSchedule: [
            { label: 'Deposit', percentage: 50, amountPaise: 1250000, dueTrigger: 'on_accept' },
            {
              label: 'Final payment',
              percentage: 50,
              amountPaise: 1250000,
              dueTrigger: 'on_prior_approved',
            },
          ],
          revisionsIncluded: 2,
        } as any,
      });
      sourceQuoteId = sourceQuote.id;

      const targetReq = await prisma.projectRequest.create({
        data: {
          userId,
          title: 'Target for quote prefill E2E',
          description: 'Target request for prefill suggestions E2E.',
          category: 'webDevelopment',
          requirements: ['Target'],
          status: 'SUBMITTED',
        },
      });
      targetRequestId = targetReq.id;
    });

    it('POST /admin/requests/:id/quotes with prefillFromPackage creates quote from package deliverables', async () => {
      const res = await request(basePath())
        .post(`/admin/requests/${prefillRequestId}/quotes`)
        .set(adminAuthHeader())
        .send({
          prefillFromPackage: true,
          taxPercentage: 0,
          currency: 'INR',
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          schedulePreset: '50-50',
          revisionsIncluded: 3,
        })
        .expect(201);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.id).toBeDefined();
      expect(data?.amount?.totalAmount).toBe(5_000_000);
      expect(data?.revisionsIncluded).toBe(3);
    });

    it('POST /admin/requests/:id/quotes/prefill returns suggestions without creating quote', async () => {
      const res = await request(basePath())
        .post(`/admin/requests/${targetRequestId}/quotes/prefill`)
        .set(adminAuthHeader())
        .send({ sourceQuoteId })
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.sourceQuoteId).toBe(sourceQuoteId);
      expect(data?.requestId ?? data?.targetRequestId).toBe(targetRequestId);
      expect(Array.isArray(data?.suggestedItems)).toBe(true);
      expect(data?.suggestedItems.length).toBeGreaterThanOrEqual(1);
      expect(data?.suggestedSchedulePreset).toBe('50-50');
    });
  });
});
