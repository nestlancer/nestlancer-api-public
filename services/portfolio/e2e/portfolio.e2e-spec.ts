import request from 'supertest';
import { createTestJwt } from '../../../libs/testing/src/helpers/test-auth.helper';
import {
  setupApp,
  teardownApp,
  getApp,
  getGlobalPrefix,
  SEEDED_USER_ID,
  SEEDED_ADMIN_ID,
} from './setup';

function authHeader(userId: string, role = 'USER') {
  const token = createTestJwt(
    { sub: userId, email: `${userId}@test.com`, role },
    { secret: process.env.JWT_ACCESS_SECRET },
  );
  return { Authorization: `Bearer ${token}` };
}

function userAuthHeader() {
  return authHeader(SEEDED_USER_ID, 'USER');
}

function adminAuthHeader() {
  return authHeader(SEEDED_ADMIN_ID, 'ADMIN');
}

describe('Portfolio Service - Public & Admin APIs (E2E)', () => {
  const prefix = getGlobalPrefix();
  const missingPortfolioId = '00000000-0000-0000-0000-000000000000';
  const missingCategoryId = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  describe('Health (smoke)', () => {
    it('GET /portfolio/health returns 200 and portfolio status envelope', async () => {
      const res = await request(getApp().getHttpServer()).get(`/${prefix}/portfolio/health`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data?.status).toBe('ok');
      expect(res.body.data?.service).toBe('portfolio');
    });
  });

  describe('Public portfolio listing & search', () => {
    it('GET /portfolio returns 200 and paginated items envelope', async () => {
      const res = await request(getApp().getHttpServer()).get(`/${prefix}/portfolio`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data?.items)).toBe(true);
      expect(typeof res.body.data?.totalItems).toBe('number');
    });

    it('GET /portfolio/search with too-short query returns 400 validation error', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/portfolio/search`)
        .query({ q: 'a' }); // MinLength(2)

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('GET /portfolio/search with a null-byte query returns 400', async () => {
      const res = await request(getApp().getHttpServer()).get(
        `/${prefix}/portfolio/search?q=%00`,
      );

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });
  });

  describe('Public portfolio featured & categories', () => {
    it('GET /portfolio/featured returns 200 and array of featured items', async () => {
      const res = await request(getApp().getHttpServer()).get(`/${prefix}/portfolio/featured`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /portfolio/categories returns 200 and array of categories', async () => {
      const res = await request(getApp().getHttpServer()).get(`/${prefix}/portfolio/categories`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Public portfolio details', () => {
    it('GET /portfolio/:idOrSlug with non-existent slug returns 404 and error envelope', async () => {
      const res = await request(getApp().getHttpServer()).get(
        `/${prefix}/portfolio/non-existent-slug`,
      );

      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
    });
  });

  describe('Public portfolio tags', () => {
    it('GET /portfolio/tags returns 200 and tags array', async () => {
      const res = await request(getApp().getHttpServer()).get(`/${prefix}/portfolio/tags`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Likes (auth)', () => {
    it('POST /portfolio/:id/like without token returns 401', async () => {
      const res = await request(getApp().getHttpServer()).post(
        `/${prefix}/portfolio/00000000-0000-0000-0000-000000000000/like`,
      );

      expect(res.status).toBe(401);
    });
  });

  describe('Admin portfolio auth', () => {
    it('GET /admin/portfolio without token returns 401', async () => {
      const res = await request(getApp().getHttpServer()).get(`/${prefix}/admin/portfolio`);

      expect(res.status).toBe(401);
    });

    it('GET /admin/portfolio with non-admin token returns 403', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/admin/portfolio`)
        .set(userAuthHeader());

      expect(res.status).toBe(403);
    });

    it('GET /admin/portfolio with admin token returns 200 and success envelope', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/admin/portfolio`)
        .set(adminAuthHeader());

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeDefined();
    });
  });

  describe('Admin portfolio listing & analytics', () => {
    it('GET /admin/portfolio with admin token returns 200 and paginated items', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/admin/portfolio`)
        .set(adminAuthHeader());

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data.items ?? res.body.data)).toBe(true);
    });

    it('GET /admin/portfolio/analytics with admin token returns 200 and analytics payload', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/admin/portfolio/analytics`)
        .set(adminAuthHeader());

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(typeof res.body.data?.totalViews).toBe('number');
      expect(typeof res.body.data?.totalLikes).toBe('number');
      expect(Array.isArray(res.body.data?.topItems)).toBe(true);
    });

    it('GET /admin/portfolio/analytics/:id with admin token returns 200 and per-item analytics (possibly null)', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/admin/portfolio/analytics/${missingPortfolioId}`)
        .set(adminAuthHeader());

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data === null || typeof res.body.data === 'object').toBe(true);
    });
  });

  describe('Admin portfolio validation & not-found errors', () => {
    it('POST /admin/portfolio with empty body returns 400 HTTP_400 validation error', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`/${prefix}/admin/portfolio`)
        .set(adminAuthHeader())
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
      expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    });

    it('POST /admin/portfolio/bulk-update with valid payload returns 200 and success envelope', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`/${prefix}/admin/portfolio/bulk-update`)
        .set(adminAuthHeader())
        .send({
          operation: 'PUBLISH',
          ids: [missingPortfolioId],
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('GET /admin/portfolio/:id for non-existent id returns 404 HTTP_404 error', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/admin/portfolio/${missingPortfolioId}`)
        .set(adminAuthHeader());

      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
      expect(res.body.error?.code).toBe('HTTP_404');
    });

    it('PATCH /admin/portfolio/:id for non-existent id returns 404 HTTP_404 error', async () => {
      const res = await request(getApp().getHttpServer())
        .patch(`/${prefix}/admin/portfolio/${missingPortfolioId}`)
        .set(adminAuthHeader())
        .send({ title: 'Updated title' });

      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
      expect(res.body.error?.code).toBe('HTTP_404');
    });

    it('DELETE /admin/portfolio/:id for non-existent id returns 404 HTTP_404 error', async () => {
      const res = await request(getApp().getHttpServer())
        .delete(`/${prefix}/admin/portfolio/${missingPortfolioId}`)
        .set(adminAuthHeader());

      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
      expect(res.body.error?.code).toBe('HTTP_404');
    });

    it('POST /admin/portfolio/:id/publish for non-existent id returns 404 HTTP_404 error', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`/${prefix}/admin/portfolio/${missingPortfolioId}/publish`)
        .set(adminAuthHeader());

      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
      expect(res.body.error?.code).toBe('HTTP_404');
    });

    it('POST /admin/portfolio/:id/unpublish for non-existent id returns 404 HTTP_404 error', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`/${prefix}/admin/portfolio/${missingPortfolioId}/unpublish`)
        .set(adminAuthHeader());

      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
      expect(res.body.error?.code).toBe('HTTP_404');
    });

    it('POST /admin/portfolio/:id/archive for non-existent id returns 404 HTTP_404 error', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`/${prefix}/admin/portfolio/${missingPortfolioId}/archive`)
        .set(adminAuthHeader());

      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
      expect(res.body.error?.code).toBe('HTTP_404');
    });

    it('POST /admin/portfolio/:id/toggle-featured for non-existent id returns 404 HTTP_404 error', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`/${prefix}/admin/portfolio/${missingPortfolioId}/toggle-featured`)
        .set(adminAuthHeader());

      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
      expect(res.body.error?.code).toBe('HTTP_404');
    });

    it('PATCH /admin/portfolio/:id/privacy for non-existent id returns 404 HTTP_404 error', async () => {
      const res = await request(getApp().getHttpServer())
        .patch(`/${prefix}/admin/portfolio/${missingPortfolioId}/privacy`)
        .set(adminAuthHeader())
        .send({ visibility: 'PUBLIC' });

      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
      expect(res.body.error?.code).toBe('HTTP_404');
    });

    it('POST /admin/portfolio/:id/duplicate for non-existent id returns 404 HTTP_404 error', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`/${prefix}/admin/portfolio/${missingPortfolioId}/duplicate`)
        .set(adminAuthHeader());

      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
      expect(res.body.error?.code).toBe('HTTP_404');
    });

    it('POST /admin/portfolio/:id/media for non-existent id returns 500 INTERNAL_ERROR', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`/${prefix}/admin/portfolio/${missingPortfolioId}/media`)
        .set(adminAuthHeader())
        .send({ mediaId: 'media-1', alt: 'Alt', caption: 'Caption' });

      expect(res.status).toBe(500);
      expect(res.body.status).toBe('error');
      expect(res.body.error?.code).toBe('INTERNAL_ERROR');
    });

    it('DELETE /admin/portfolio/:id/media/:mediaId for non-existent id returns 500 INTERNAL_ERROR', async () => {
      const res = await request(getApp().getHttpServer())
        .delete(`/${prefix}/admin/portfolio/${missingPortfolioId}/media/media-1`)
        .set(adminAuthHeader());

      expect(res.status).toBe(500);
      expect(res.body.status).toBe('error');
      expect(res.body.error?.code).toBe('INTERNAL_ERROR');
    });

    it('PATCH /admin/portfolio/:id/media/reorder for non-existent id returns 500 INTERNAL_ERROR', async () => {
      const res = await request(getApp().getHttpServer())
        .patch(`/${prefix}/admin/portfolio/${missingPortfolioId}/media/reorder`)
        .set(adminAuthHeader())
        .send([{ id: 'media-1', order: 1 }]);

      expect(res.status).toBe(500);
      expect(res.body.status).toBe('error');
      expect(res.body.error?.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('Admin portfolio categories auth', () => {
    it('GET /admin/portfolio/categories without token returns 401', async () => {
      const res = await request(getApp().getHttpServer()).get(
        `/${prefix}/admin/portfolio/categories`,
      );

      expect(res.status).toBe(401);
    });

    it('GET /admin/portfolio/categories with non-admin token returns 403', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/admin/portfolio/categories`)
        .set(userAuthHeader());

      expect(res.status).toBe(403);
    });
  });

  describe('Admin portfolio categories validation & errors', () => {
    it('POST /admin/portfolio/categories with empty body returns 400 HTTP_400 validation error', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`/${prefix}/admin/portfolio/categories`)
        .set(adminAuthHeader())
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
      expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    });

    it('PATCH /admin/portfolio/categories/:id for non-existent id returns 500 INTERNAL_ERROR', async () => {
      const res = await request(getApp().getHttpServer())
        .patch(`/${prefix}/admin/portfolio/categories/${missingCategoryId}`)
        .set(adminAuthHeader())
        .send({ name: 'Updated Category' });

      expect(res.status).toBe(500);
      expect(res.body.status).toBe('error');
      expect(res.body.error?.code).toBe('INTERNAL_ERROR');
    });

    it('DELETE /admin/portfolio/categories/:id for non-existent id returns 404 HTTP_404 error', async () => {
      const res = await request(getApp().getHttpServer())
        .delete(`/${prefix}/admin/portfolio/categories/${missingCategoryId}`)
        .set(adminAuthHeader());

      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
      expect(res.body.error?.code).toBe('HTTP_404');
    });
  });
});
