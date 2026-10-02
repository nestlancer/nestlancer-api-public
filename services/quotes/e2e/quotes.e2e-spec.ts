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
  return authHeader('admin-quotes-e2e-1', 'ADMIN');
}

describe('Quotes Service (E2E)', () => {
  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  describe('Health (smoke)', () => {
    it('GET /quotes/health returns 200 with success envelope and ok status', async () => {
      const res = await request(getAppUrl().replace(/\/$/, ''))
        .get(`/${prefix}/quotes/health`)
        .expect(200);

      expect(res.body?.status).toBe('success');
      expect(res.body?.data?.status).toBe('ok');
      expect(res.body?.data?.service).toBe('quotes');
    });
  });

  describe('Auth guards', () => {
    it('GET /quotes without token returns 401 error', async () => {
      const res = await request(basePath()).get('/quotes').expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('GET /quotes/stats without token returns 401 error', async () => {
      const res = await request(basePath()).get('/quotes/stats').expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('GET /quotes/:id without token returns 401 error', async () => {
      const res = await request(basePath())
        .get('/quotes/00000000-0000-0000-0000-000000000000')
        .expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('POST /quotes/:id/accept without token returns 401 error', async () => {
      const res = await request(basePath())
        .post('/quotes/00000000-0000-0000-0000-000000000000/accept')
        .send({})
        .expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('POST /quotes/:id/decline without token returns 401 error', async () => {
      const res = await request(basePath())
        .post('/quotes/00000000-0000-0000-0000-000000000000/decline')
        .send({})
        .expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('POST /quotes/:id/request-changes without token returns 401 error', async () => {
      const res = await request(basePath())
        .post('/quotes/00000000-0000-0000-0000-000000000000/request-changes')
        .send({})
        .expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('GET /quotes/:id/pdf without token returns 401 error', async () => {
      const res = await request(basePath())
        .get('/quotes/00000000-0000-0000-0000-000000000000/pdf')
        .expect(401);
      expect(res.body?.status).toBe('error');
    });
  });

  describe('Client - list and details', () => {
    const userId = 'quotes-e2e-client-1';
    let quoteId: string;

    beforeAll(async () => {
      const prisma = getTestPrismaClient();
      if (!prisma) {
        throw new Error('Prisma client not initialised');
      }

      const request = await prisma.projectRequest.create({
        data: {
          userId,
          title: 'E2E Quote Request - List',
          description:
            'E2E request for listing quotes. This description is intentionally long enough.',
          category: 'webDevelopment',
          requirements: ['Requirement 1'],
          status: 'SUBMITTED',
        },
      });

      const quote = await prisma.quote.create({
        data: {
          requestId: request.id,
          userId,
          createdById: 'admin-quotes-e2e-1',
          title: 'E2E Test Quote - List',
          description: 'Quote created for list/details E2E tests.',
          subtotal: 100000,
          taxPercentage: 0,
          taxAmount: 0,
          totalAmount: 100000,
          currency: 'INR',
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'SENT',
        },
      });

      quoteId = quote.id;
    });

    it('GET /quotes returns 200 and list of quotes for authenticated user', async () => {
      const res = await request(basePath()).get('/quotes').set(authHeader(userId)).expect(200);

      expect(res.body?.status).toBe('success');
      const payload = res.body?.data ?? res.body;
      const items = Array.isArray(payload) ? payload : payload?.items;
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThanOrEqual(1);
      const found = items.find((q: any) => q.id === quoteId);
      expect(found).toBeDefined();
      expect(found.requestId).toBeDefined();
      expect(typeof found.totalAmount).toBe('number');
    });

    it('GET /quotes/stats returns 200 and stats payload for user', async () => {
      const res = await request(basePath())
        .get('/quotes/stats')
        .set(authHeader(userId))
        .expect(200);

      expect(res.body?.status).toBe('success');
      expect(res.body?.data).toBeDefined();
      expect(typeof res.body?.data?.total).toBe('number');
      expect(res.body?.data?.total).toBeGreaterThanOrEqual(1);
      expect(res.body?.data?.byStatus).toBeDefined();
    });

    it('GET /quotes/:id returns 200 and quote details for existing quote', async () => {
      const res = await request(basePath())
        .get(`/quotes/${quoteId}`)
        .set(authHeader(userId))
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.id).toBe(quoteId);
      expect(data?.request?.id).toBeDefined();
      expect(typeof data?.totalAmount).toBe('number');
      expect(Array.isArray(data?.paymentBreakdown)).toBe(true);
    });

    it('GET /quotes/:id returns 422 and business error code for non-existent id', async () => {
      const res = await request(basePath())
        .get('/quotes/00000000-0000-0000-0000-000000000000')
        .set(authHeader(userId))
        .expect(422);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('QUOTE_001');
      expect(typeof res.body?.error?.message).toBe('string');
    });
  });

  describe('Client - actions on quote', () => {
    const userId = 'quotes-e2e-client-2';
    let validQuoteId: string;
    let expiredQuoteId: string;

    beforeAll(async () => {
      const prisma = getTestPrismaClient();
      if (!prisma) {
        throw new Error('Prisma client not initialised');
      }

      const requestValid = await prisma.projectRequest.create({
        data: {
          userId,
          title: 'E2E Quote Request - Actions Valid',
          description: 'Request used to create a valid quote for actions tests.',
          category: 'webDevelopment',
          requirements: ['Requirement 1'],
          status: 'SUBMITTED',
        },
      });

      const requestExpired = await prisma.projectRequest.create({
        data: {
          userId,
          title: 'E2E Quote Request - Actions Expired',
          description: 'Request used to create an expired quote for actions tests.',
          category: 'webDevelopment',
          requirements: ['Requirement 1'],
          status: 'SUBMITTED',
        },
      });

      const validQuote = await prisma.quote.create({
        data: {
          requestId: requestValid.id,
          userId,
          createdById: 'admin-quotes-e2e-1',
          title: 'E2E Actions Quote - Valid',
          description: 'Quote that can be accepted successfully.',
          subtotal: 50000,
          taxPercentage: 0,
          taxAmount: 0,
          totalAmount: 50000,
          currency: 'INR',
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'SENT',
        },
      });

      const expiredQuote = await prisma.quote.create({
        data: {
          requestId: requestExpired.id,
          userId,
          createdById: 'admin-quotes-e2e-1',
          title: 'E2E Actions Quote - Expired',
          description: 'Quote that is already expired.',
          subtotal: 50000,
          taxPercentage: 0,
          taxAmount: 0,
          totalAmount: 50000,
          currency: 'INR',
          validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000),
          status: 'SENT',
        },
      });

      validQuoteId = validQuote.id;
      expiredQuoteId = expiredQuote.id;
    });

    it('POST /quotes/:id/accept accepts a valid quote and returns 200 with accepted status', async () => {
      const res = await request(basePath())
        .post(`/quotes/${validQuoteId}/accept`)
        .set(authHeader(userId))
        .send({
          acceptTerms: true,
          signatureName: 'E2E Test User',
          signatureDate: new Date().toISOString(),
          notes: 'E2E acceptance test',
        })
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.quoteId).toBe(validQuoteId);
      expect(data?.status).toBe('accepted');
      expect(data?.project?.status).toBe('creating');
    });

    it('POST /quotes/:id/accept on expired quote returns 422 with QUOTE_004', async () => {
      const res = await request(basePath())
        .post(`/quotes/${expiredQuoteId}/accept`)
        .set(authHeader(userId))
        .send({
          acceptTerms: true,
          signatureName: 'E2E Test User',
          signatureDate: new Date().toISOString(),
          notes: 'E2E acceptance test',
        })
        .expect(422);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('QUOTE_004');
    });

    it('POST /quotes/:id/accept on already accepted quote returns 422 with QUOTE_003', async () => {
      const res = await request(basePath())
        .post(`/quotes/${validQuoteId}/accept`)
        .set(authHeader(userId))
        .send({
          acceptTerms: true,
          signatureName: 'E2E Test User',
          signatureDate: new Date().toISOString(),
          notes: 'Second accept should fail',
        })
        .expect(422);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('QUOTE_003');
    });

    it('POST /quotes/:id/decline declines a pending quote and returns 200 with declined status', async () => {
      const prisma = getTestPrismaClient();
      if (!prisma) {
        throw new Error('Prisma client not initialised');
      }

      const projectRequest = await prisma.projectRequest.create({
        data: {
          userId,
          title: 'E2E Quote Request - Decline',
          description: 'Request used to decline a quote.',
          category: 'webDevelopment',
          requirements: ['Requirement 1'],
          status: 'SUBMITTED',
        },
      });

      const quote = await prisma.quote.create({
        data: {
          requestId: projectRequest.id,
          userId,
          createdById: 'admin-quotes-e2e-1',
          title: 'E2E Actions Quote - Decline',
          description: 'Quote that will be declined.',
          subtotal: 40000,
          taxPercentage: 0,
          taxAmount: 0,
          totalAmount: 40000,
          currency: 'INR',
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'SENT',
        },
      });

      const res = await request(basePath())
        .post(`/quotes/${quote.id}/decline`)
        .set(authHeader(userId))
        .send({
          reason: 'budgetConstraints',
          feedback: 'Too expensive for our current budget.',
          requestRevision: false,
        })
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.quoteId).toBe(quote.id);
      expect(data?.status).toBe('declined');
      expect(data?.reason).toBe('budgetConstraints');
    });

    it('POST /quotes/:id/decline with requestRevision keeps request re-quotable', async () => {
      const prisma = getTestPrismaClient();
      if (!prisma) {
        throw new Error('Prisma client not initialised');
      }

      const projectRequest = await prisma.projectRequest.create({
        data: {
          userId,
          title: 'E2E Quote Request - Decline Revision',
          description: 'Request used to decline with revision intent.',
          category: 'webDevelopment',
          requirements: ['Requirement 1'],
          status: 'SUBMITTED',
        },
      });

      const quote = await prisma.quote.create({
        data: {
          requestId: projectRequest.id,
          userId,
          createdById: 'admin-quotes-e2e-1',
          title: 'E2E Actions Quote - Decline Revision',
          description: 'Quote declined with revision requested.',
          subtotal: 50000,
          taxPercentage: 0,
          taxAmount: 0,
          totalAmount: 50000,
          currency: 'INR',
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'SENT',
        },
      });

      await request(basePath())
        .post(`/quotes/${quote.id}/decline`)
        .set(authHeader(userId))
        .send({
          reason: 'scopeDiscrepancy',
          feedback: 'Need a revised scope.',
          requestRevision: true,
        })
        .expect(200);

      const updatedRequest = await prisma.projectRequest.findUnique({
        where: { id: projectRequest.id },
      });
      expect(updatedRequest?.status).toBe('CHANGES_REQUESTED');
    });

    it('POST /quotes/:id/request-changes marks quote as changesRequested and returns 200', async () => {
      const prisma = getTestPrismaClient();
      if (!prisma) {
        throw new Error('Prisma client not initialised');
      }

      const projectRequest = await prisma.projectRequest.create({
        data: {
          userId,
          title: 'E2E Quote Request - Changes',
          description: 'Request used to request changes on a quote.',
          category: 'webDevelopment',
          requirements: ['Requirement 1'],
          status: 'SUBMITTED',
        },
      });

      const quote = await prisma.quote.create({
        data: {
          requestId: projectRequest.id,
          userId,
          createdById: 'admin-quotes-e2e-1',
          title: 'E2E Actions Quote - Changes',
          description: 'Quote where client will request changes.',
          subtotal: 60000,
          taxPercentage: 0,
          taxAmount: 0,
          totalAmount: 60000,
          currency: 'INR',
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'SENT',
        },
      });

      const res = await request(basePath())
        .post(`/quotes/${quote.id}/request-changes`)
        .set(authHeader(userId))
        .send({
          changes: [
            {
              area: 'budget',
              request: 'Reduce total by 10% in exchange for fewer revisions.',
            },
          ],
          additionalNotes: 'E2E change request test',
        })
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.quoteId).toBe(quote.id);
      expect(data?.status).toBe('changesRequested');
      expect(data?.estimatedRevisionDate).toBeDefined();
    });

    it('POST /quotes/:id/request-changes on accepted quote returns 422 with QUOTE_006', async () => {
      const prisma = getTestPrismaClient();
      if (!prisma) {
        throw new Error('Prisma client not initialised');
      }

      const projectRequest = await prisma.projectRequest.create({
        data: {
          userId,
          title: 'E2E Quote Request - Changes Error',
          description: 'Request used to test changes on accepted quote.',
          category: 'webDevelopment',
          requirements: ['Requirement 1'],
          status: 'ACCEPTED',
        },
      });

      const quote = await prisma.quote.create({
        data: {
          requestId: projectRequest.id,
          userId,
          createdById: 'admin-quotes-e2e-1',
          title: 'E2E Actions Quote - Accepted',
          description: 'Quote already accepted.',
          subtotal: 60000,
          taxPercentage: 0,
          taxAmount: 0,
          totalAmount: 60000,
          currency: 'INR',
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'ACCEPTED',
        },
      });

      const res = await request(basePath())
        .post(`/quotes/${quote.id}/request-changes`)
        .set(authHeader(userId))
        .send({
          changes: [
            {
              area: 'scope',
              request: 'Add more features',
            },
          ],
          additionalNotes: 'Should not be allowed for accepted quotes',
        })
        .expect(422);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('QUOTE_006');
    });

    it('GET /quotes/:id/pdf returns 200 and presigned download metadata for existing quote', async () => {
      const prisma = getTestPrismaClient();
      if (!prisma) {
        throw new Error('Prisma client not initialised');
      }

      const projectRequest = await prisma.projectRequest.create({
        data: {
          userId,
          title: 'E2E Quote Request - PDF',
          description: 'Request used to generate a PDF.',
          category: 'webDevelopment',
          requirements: ['Requirement 1'],
          status: 'SUBMITTED',
        },
      });

      const quote = await prisma.quote.create({
        data: {
          requestId: projectRequest.id,
          userId,
          createdById: 'admin-quotes-e2e-1',
          title: 'E2E Actions Quote - PDF',
          description: 'Quote used for PDF generation.',
          subtotal: 30000,
          taxPercentage: 0,
          taxAmount: 0,
          totalAmount: 30000,
          currency: 'INR',
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'SENT',
        },
      });

      const res = await request(basePath())
        .get(`/quotes/${quote.id}/pdf`)
        .set(authHeader(userId))
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.quoteId).toBe(quote.id);
      expect(typeof data?.downloadUrl).toBe('string');
      expect(data?.documentNumber).toMatch(/^NL-QTE-/);
    });

    it('GET /quotes/:id/pdf for non-existent quote returns 422 with QUOTE_001', async () => {
      const res = await request(basePath())
        .get('/quotes/00000000-0000-0000-0000-000000000000/pdf')
        .set(authHeader(userId))
        .expect(422);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('QUOTE_001');
    });
  });

  describe('Admin - auth guards', () => {
    it('GET /admin/quotes without token returns 401', async () => {
      const res = await request(basePath()).get('/admin/quotes').expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('GET /admin/quotes with USER role returns 403', async () => {
      const res = await request(basePath())
        .get('/admin/quotes')
        .set(authHeader('user-1', 'USER'))
        .expect(403);

      expect(res.body?.status).toBe('error');
    });
  });

  describe('Admin - list, stats and templates', () => {
    let adminVisibleQuoteId: string;

    beforeAll(async () => {
      const prisma = getTestPrismaClient();
      if (!prisma) {
        throw new Error('Prisma client not initialised');
      }

      const request = await prisma.projectRequest.create({
        data: {
          userId: 'quotes-e2e-client-3',
          title: 'E2E Admin List Request',
          description: 'Request used to verify admin listing and stats.',
          category: 'webDevelopment',
          requirements: ['Requirement 1'],
          status: 'SUBMITTED',
        },
      });

      const quote = await prisma.quote.create({
        data: {
          requestId: request.id,
          userId: 'quotes-e2e-client-3',
          createdById: 'admin-quotes-e2e-1',
          title: 'E2E Admin List Quote',
          description: 'Quote visible in admin list.',
          subtotal: 80000,
          taxPercentage: 0,
          taxAmount: 0,
          totalAmount: 80000,
          currency: 'INR',
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'SENT',
        },
      });

      adminVisibleQuoteId = quote.id;
    });

    it('GET /admin/quotes with admin token returns 200 and paginated list', async () => {
      const res = await request(basePath()).get('/admin/quotes').set(adminAuthHeader()).expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(Array.isArray(data?.data)).toBe(true);
      expect(data?.data.length).toBeGreaterThanOrEqual(1);
      expect(data?.pagination).toBeDefined();
      expect(typeof data?.pagination?.page).toBe('number');
      expect(typeof data?.pagination?.limit).toBe('number');
      expect(typeof data?.pagination?.total).toBe('number');
    });

    it('GET /admin/quotes/stats returns 200 and overall stats', async () => {
      const res = await request(basePath())
        .get('/admin/quotes/stats')
        .set(adminAuthHeader())
        .expect(200);

      expect(res.body?.status).toBe('success');
      expect(res.body?.data).toBeDefined();
      expect(typeof res.body?.data?.total).toBe('number');
      expect(res.body?.data?.byStatus).toBeDefined();
    });

    it('GET /admin/quotes/templates returns 200 with deprecated meta and line-item library', async () => {
      const res = await request(basePath())
        .get('/admin/quotes/templates')
        .set(adminAuthHeader())
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(Array.isArray(data?.templates)).toBe(true);
      expect(data?._meta?.deprecated).toBe(true);
      expect(Array.isArray(data?.lineItemLibrary)).toBe(true);
    });

    it('POST /admin/quotes/templates returns 410 Gone', async () => {
      const res = await request(basePath())
        .post('/admin/quotes/templates')
        .set(adminAuthHeader())
        .send({
          name: 'Standard Web Project Template',
          sections: ['Overview', 'Scope', 'Timeline', 'Pricing'],
        })
        .expect(410);

      const body = res.body?.error ?? res.body;
      expect(
        body?.code === 'QUOTE_TEMPLATE_DEPRECATED' ||
          body?.statusCode === 410 ||
          res.status === 410,
      ).toBe(true);
    });

    it('GET /admin/quotes/line-item-library returns 200 and blocks array', async () => {
      const res = await request(basePath())
        .get('/admin/quotes/line-item-library')
        .set(adminAuthHeader())
        .expect(200);

      expect(res.body?.status).toBe('success');
      const blocks = res.body?.data?.blocks ?? res.body?.blocks;
      expect(Array.isArray(blocks)).toBe(true);
    });

    it('POST /admin/quotes/line-item-library creates a block with 201', async () => {
      const slug = `e2e-block-${Date.now()}`;
      const res = await request(basePath())
        .post('/admin/quotes/line-item-library')
        .set(adminAuthHeader())
        .send({
          slug,
          label: 'E2E Custom Block',
          description: 'Created during quotes E2E',
          category: 'backend',
          defaultUnitPrice: 12000,
          defaultQuantity: 1,
        })
        .expect(201);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.slug).toBe(slug);
      expect(data?.defaultUnitPrice).toBe(12000);
    });
  });

  describe('Admin - duplicate onto target request', () => {
    let sourceQuoteId: string;
    let targetRequestId: string;

    beforeAll(async () => {
      const prisma = getTestPrismaClient();
      if (!prisma) throw new Error('Prisma client not initialised');

      const sourceRequest = await prisma.projectRequest.create({
        data: {
          userId: 'quotes-e2e-client-2',
          title: 'Source request for duplicate E2E',
          description: 'Source request for duplicate onto target E2E.',
          category: 'webDevelopment',
          requirements: ['Req'],
          status: 'SUBMITTED',
        },
      });

      const sourceQuote = await prisma.quote.create({
        data: {
          requestId: sourceRequest.id,
          userId: 'quotes-e2e-client-2',
          title: 'Source quote',
          description: 'Source quote for duplicate E2E',
          subtotal: 500000,
          totalAmount: 500000,
          currency: 'INR',
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'DRAFT',
          paymentBreakdown: [
            {
              description: 'Build phase',
              quantity: 1,
              unitPrice: 500000,
              totalPrice: 500000,
            },
          ],
          revisionsIncluded: 2,
        },
      });
      sourceQuoteId = sourceQuote.id;

      const targetRequest = await prisma.projectRequest.create({
        data: {
          userId: 'quotes-e2e-client-3',
          title: 'Target request for duplicate E2E',
          description: 'Target request for duplicate onto target E2E.',
          category: 'webDevelopment',
          requirements: ['Req'],
          status: 'SUBMITTED',
        },
      });
      targetRequestId = targetRequest.id;
    });

    it('POST /admin/quotes/:id/duplicate with targetRequestId copies onto existing request', async () => {
      const res = await request(basePath())
        .post(`/admin/quotes/${sourceQuoteId}/duplicate`)
        .set(adminAuthHeader())
        .send({ targetRequestId })
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.originalId).toBe(sourceQuoteId);
      expect(data?.targetRequestId).toBe(targetRequestId);
      expect(data?.newQuoteId).toBeDefined();
      expect(data?.status).toBe('draft');
    });
  });

  describe('Admin - quote actions', () => {
    let requestId: string;
    let createdQuoteId: string;

    beforeAll(async () => {
      const prisma = getTestPrismaClient();
      if (!prisma) {
        throw new Error('Prisma client not initialised');
      }

      const request = await prisma.projectRequest.create({
        data: {
          userId: 'quotes-e2e-client-1',
          title: 'E2E Admin Actions Request',
          description: 'Request used for admin quote actions tests.',
          category: 'webDevelopment',
          requirements: ['Requirement 1'],
          status: 'SUBMITTED',
        },
      });

      requestId = request.id;
    });

    it('POST /admin/quotes creates quote with 201 when payload is valid', async () => {
      const res = await request(basePath())
        .post('/admin/quotes')
        .set(adminAuthHeader())
        .send({
          requestId,
          title: 'E2E Admin Quote',
          description: 'E2E test quote for admin flow.',
          totalAmount: 10000,
          currency: 'INR',
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          paymentBreakdown: [
            {
              description: 'Initial deposit',
              amount: 5000,
              percentage: 50,
              dueDate: new Date().toISOString(),
            },
            {
              description: 'Final payment',
              amount: 5000,
              percentage: 50,
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            },
          ],
        })
        .expect(201);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.id).toBeDefined();
      expect(data?.status).toBe('draft');
      createdQuoteId = data.id;
    });

    it('POST /admin/quotes with mismatched payment breakdown returns 422 with QUOTE_009', async () => {
      const res = await request(basePath())
        .post('/admin/quotes')
        .set(adminAuthHeader())
        .send({
          requestId,
          title: 'Invalid Admin Quote',
          description: 'Total does not match payment breakdown.',
          totalAmount: 10000,
          currency: 'INR',
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          paymentBreakdown: [
            {
              description: 'Only payment',
              amount: 9000,
              percentage: 90,
              dueDate: new Date().toISOString(),
            },
          ],
        })
        .expect(422);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('QUOTE_009');
    });

    it('GET /admin/quotes/:id returns 200 and quote administrative details for existing id', async () => {
      const res = await request(basePath())
        .get(`/admin/quotes/${createdQuoteId}`)
        .set(adminAuthHeader())
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.id).toBe(createdQuoteId);
      expect(data?.requestId).toBe(requestId);
    });

    it('PATCH /admin/quotes/:id updates quote title and returns 200', async () => {
      const res = await request(basePath())
        .patch(`/admin/quotes/${createdQuoteId}`)
        .set(adminAuthHeader())
        .send({ title: 'Updated E2E Admin Quote Title' })
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.quoteId).toBe(createdQuoteId);
      expect(data?.updated).toBe(true);
      expect(data?.data?.title).toBe('Updated E2E Admin Quote Title');
    });

    it('POST /admin/quotes/:id/send marks quote as sent and returns 200', async () => {
      const res = await request(basePath())
        .post(`/admin/quotes/${createdQuoteId}/send`)
        .set(adminAuthHeader())
        .expect(200);

      expect(res.body?.status).toBe('success');
      expect(res.body?.data ?? res.body).toBe(true);
    });

    it('POST /admin/quotes/:id/resend also returns 200', async () => {
      const res = await request(basePath())
        .post(`/admin/quotes/${createdQuoteId}/resend`)
        .set(adminAuthHeader())
        .expect(200);

      expect(res.body?.status).toBe('success');
      expect(res.body?.data ?? res.body).toBe(true);
    });

    it('POST /admin/quotes/:id/duplicate creates a duplicate quote and returns 200', async () => {
      const res = await request(basePath())
        .post(`/admin/quotes/${createdQuoteId}/duplicate`)
        .set(adminAuthHeader())
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.originalId).toBe(createdQuoteId);
      expect(data?.newQuoteId).toBeDefined();
      expect(data?.newRequestId).toBeDefined();
    });

    it('client request-changes moves quote to CHANGES_REQUESTED before admin revise', async () => {
      const res = await request(basePath())
        .post(`/quotes/${createdQuoteId}/request-changes`)
        .set(authHeader('quotes-e2e-client-1'))
        .send({
          changes: [{ area: 'scope', request: 'Adjust payment schedule for E2E revise test' }],
          additionalNotes: 'Prep for admin revise',
        })
        .expect(200);

      expect(res.body?.status).toBe('success');
    });

    it('POST /admin/quotes/:id/revise updates quote and emits outbox event (200)', async () => {
      const res = await request(basePath())
        .post(`/admin/quotes/${createdQuoteId}/revise`)
        .set(adminAuthHeader())
        .send({ title: 'Revised E2E Admin Quote Title' })
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.originalId).toBe(createdQuoteId);
      expect(data?.data?.status).toBe('REVISED');
    });

    it('GET /admin/quotes/:id/history returns 200 and revision history list', async () => {
      const res = await request(basePath())
        .get(`/admin/quotes/${createdQuoteId}/history`)
        .set(adminAuthHeader())
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.quoteId).toBe(createdQuoteId);
      expect(Array.isArray(data?.history)).toBe(true);
    });

    it('GET /admin/quotes/:id/pdf returns 200 and metadata with pdfUrl', async () => {
      const res = await request(basePath())
        .get(`/admin/quotes/${createdQuoteId}/pdf`)
        .set(adminAuthHeader())
        .expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(data?.quoteId).toBe(createdQuoteId);
      expect(typeof data?.pdfUrl).toBe('string');
    });

    it('DELETE /admin/quotes/:id deletes quote and returns 204', async () => {
      const res = await request(basePath())
        .delete(`/admin/quotes/${createdQuoteId}`)
        .set(adminAuthHeader())
        .expect(204);

      expect(res.status).toBe(204);
    });
  });

  describe('Flow Plan V2 — quote extend restores request (V2-FIX-003)', () => {
    const userId = 'quotes-e2e-client-3';
    let quoteId: string;
    let requestId: string;

    beforeAll(async () => {
      const prisma = getTestPrismaClient();
      if (!prisma) throw new Error('Prisma not initialized');

      const req = await prisma.projectRequest.create({
        data: {
          userId,
          title: 'Expired quote recovery E2E',
          description: 'Request for quote extend flow plan v2 test case.',
          category: 'webDevelopment',
          requirements: ['extend'],
          status: 'EXPIRED_QUOTE',
        },
      });
      requestId = req.id;

      const quote = await prisma.quote.create({
        data: {
          requestId: req.id,
          userId,
          createdById: 'admin-quotes-e2e-1',
          title: 'Expired Quote Extend Test',
          description: 'Quote expired pending extend.',
          subtotal: 50000,
          taxAmount: 0,
          totalAmount: 50000,
          currency: 'INR',
          validUntil: new Date(Date.now() - 86400000),
          status: 'EXPIRED',
          expiredAt: new Date(),
        },
      });
      quoteId = quote.id;
    });

    it('POST /admin/quotes/:id/extend restores quote SENT and request QUOTED', async () => {
      const res = await request(basePath())
        .post(`/admin/quotes/${quoteId}/extend`)
        .set(adminAuthHeader())
        .send({ extendDays: 14 })
        .expect(200);

      expect(res.body?.status).toBe('success');

      const prisma = getTestPrismaClient();
      const quote = await prisma!.quote.findUnique({ where: { id: quoteId } });
      expect(quote?.status).toBe('SENT');

      const req = await prisma!.projectRequest.findUnique({ where: { id: requestId } });
      expect(req?.status).toBe('QUOTED');

      const outbox = await prisma!.outbox.findMany({
        where: {
          type: { in: ['QUOTE_EXTENDED', 'REQUEST_STATUS_UPDATED'] },
          aggregateId: { in: [quoteId, requestId] },
        },
      });
      const types = outbox.map((o) => o.type);
      expect(types).toContain('QUOTE_EXTENDED');
      expect(types).toContain('REQUEST_STATUS_UPDATED');
    });
  });
});
