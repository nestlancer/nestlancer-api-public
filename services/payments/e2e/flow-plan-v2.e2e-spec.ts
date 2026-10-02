import request from 'supertest';
import { createTestJwt } from '../../../libs/testing/src/helpers/test-auth.helper';
import { getTestPrismaClient } from '../../../libs/testing/src/helpers/test-database.helper';
import {
  setupApp,
  teardownApp,
  getApp,
  getGlobalPrefix,
  E2E_USER_ID,
  E2E_ADMIN_ID,
  E2E_PROJECT_ID,
} from './setup';

const prefix = getGlobalPrefix();

function basePath() {
  return getApp().getHttpServer();
}

function authHeader(userId: string, role = 'USER') {
  const token = createTestJwt(
    { sub: userId, email: `${userId}@test.com`, role },
    { secret: process.env.JWT_ACCESS_SECRET },
  );
  return { Authorization: `Bearer ${token}` };
}

describe('Flow Plan V2 — Payments (E2E)', () => {
  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  describe('V2-FIX-001 — restore project after overdue payment', () => {
    const milestoneId = '55555555-5555-4555-a555-555555555555';

    beforeAll(async () => {
      const prisma = getTestPrismaClient();
      if (!prisma) throw new Error('Prisma not initialized');

      await prisma.project.update({
        where: { id: E2E_PROJECT_ID },
        data: { status: 'SUSPENDED' },
      });

      const milestone = await prisma.milestone.upsert({
        where: { id: milestoneId },
        create: {
          id: milestoneId,
          projectId: E2E_PROJECT_ID,
          name: 'Work milestone',
          status: 'APPROVED',
          order: 1,
          amount: 50000,
        },
        update: { status: 'APPROVED' },
      });

      const payment = await prisma.payment.create({
        data: {
          projectId: E2E_PROJECT_ID,
          milestoneId: milestone.id,
          clientId: E2E_USER_ID,
          amount: 50000,
          currency: 'INR',
          status: 'PENDING',
          dueDate: new Date(Date.now() - 86400000 * 15),
        },
      });
      void payment;
    });

    it('manual payment on SUSPENDED project restores IN_PROGRESS', async () => {
      const res = await request(basePath())
        .post(`/${prefix}/admin/payments/manual`)
        .set(authHeader(E2E_ADMIN_ID, 'ADMIN'))
        .send({
          projectId: E2E_PROJECT_ID,
          clientId: E2E_USER_ID,
          milestoneId,
          amount: 50000,
          currency: 'INR',
          notes: 'Bank transfer after suspension',
        })
        .expect(201);

      expect(res.body?.status).toBe('success');

      const prisma = getTestPrismaClient();
      const project = await prisma!.project.findUnique({ where: { id: E2E_PROJECT_ID } });
      expect(project?.status).toBe('IN_PROGRESS');

      const manualPaymentId = res.body?.data?.id ?? res.body?.data?.paymentId;
      const outbox = await prisma!.outbox.findMany({
        where: {
          type: { in: ['PAYMENT_COMPLETED', 'PROJECT_RESUMED', 'PROJECT_STATUS_CHANGED'] },
          OR: [
            { aggregateId: manualPaymentId },
            { payload: { path: ['projectId'], equals: E2E_PROJECT_ID } },
          ],
        },
      });
      const types = outbox.map((o) => o.type);
      expect(types).toContain('PAYMENT_COMPLETED');
      expect(types).toContain('PROJECT_RESUMED');
    });
  });
});
