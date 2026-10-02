import request from 'supertest';
import { createTestJwt } from '../../../libs/testing/src/helpers/test-auth.helper';
import {
  setupApp,
  teardownApp,
  getAppUrl,
  getGlobalPrefix,
  E2E_USER_ID,
  E2E_ADMIN_ID,
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

describe('Media Service - Media (E2E)', () => {
  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  describe('Health (smoke)', () => {
    it('GET /health without token returns 401', async () => {
      const res = await request(basePath()).get('/health').expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('GET /health with valid token returns 200 and ok status', async () => {
      const res = await request(basePath())
        .get('/health')
        .set(authHeader('e2e-media-health-1'))
        .expect(200);
      expect(res.body?.status).toBe('success');
      expect(res.body?.data?.status).toBe('ok');
      expect(res.body?.data?.service).toBe('media');
    });
  });

  describe('Auth guards', () => {
    it('GET /media without token returns 401 and error envelope', async () => {
      const res = await request(basePath()).get('/media').expect(401);
      expect(res.status).toBe(401);
      expect(res.body?.status).toBe('error');
    });

    it('GET /media/storage/stats without token returns 401', async () => {
      const res = await request(basePath()).get('/media/storage/stats').expect(401);
      expect(res.body?.status).toBe('error');
    });
  });

  describe('User media – list and storage stats', () => {
    it('GET /media with valid token returns 200 and data/pagination shape', async () => {
      const res = await request(basePath()).get('/media').set(authHeader(E2E_USER_ID)).expect(200);
      expect(res.body?.status).toBe('success');
      expect(Array.isArray(res.body?.data?.data)).toBe(true);
      expect(res.body?.data?.pagination).toBeDefined();
      expect(typeof res.body?.data?.pagination?.totalItems).toBe('number');
      expect(typeof res.body?.data?.pagination?.page).toBe('number');
    });

    it('GET /media/storage/stats with valid token returns 200 and totalUsedBytes, quotaBytes', async () => {
      const res = await request(basePath())
        .get('/media/storage/stats')
        .set(authHeader(E2E_USER_ID))
        .expect(200);
      expect(res.body?.status).toBe('success');
      expect(typeof res.body?.data?.totalUsedBytes).toBe('number');
      expect(typeof res.body?.data?.quotaBytes).toBe('number');
    });
  });

  describe('User media – request/confirm upload (E2E)', () => {
    it('POST /media/upload/request with valid payload returns 201 and mediaId, uploadUrl, key', async () => {
      const payload = {
        filename: 'e2e-test-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        fileType: 'IMAGE',
      };
      const res = await request(basePath())
        .post('/media/upload/request')
        .set(authHeader(E2E_USER_ID))
        .send(payload)
        .expect(201);
      expect(res.body?.status).toBe('success');
      expect(res.body?.data?.mediaId).toBeDefined();
      expect(typeof res.body?.data?.mediaId).toBe('string');
      expect(res.body?.data?.uploadUrl).toBeDefined();
      expect(res.body?.data?.key).toBeDefined();
      expect(res.body?.data?.expiresIn).toBe(3600);
    });

    it('POST /media/upload/request with invalid payload returns 400 and error envelope', async () => {
      const res = await request(basePath())
        .post('/media/upload/request')
        .set(authHeader(E2E_USER_ID))
        .send({ filename: 'x', mimeType: 'image/jpeg' })
        .expect(400);
      expect(res.body?.status).toBe('error');
    });

    it('POST /media/upload/confirm with valid uploadId returns 200 and updated media with status READY', async () => {
      const requestRes = await request(basePath())
        .post('/media/upload/request')
        .set(authHeader(E2E_USER_ID))
        .send({
          filename: 'e2e-confirm-test.jpg',
          mimeType: 'image/jpeg',
          size: 512,
          fileType: 'IMAGE',
        })
        .expect(201);
      const mediaId = requestRes.body?.data?.mediaId;
      expect(mediaId).toBeDefined();

      const confirmRes = await request(basePath())
        .post('/media/upload/confirm')
        .set(authHeader(E2E_USER_ID))
        .send({ uploadId: mediaId })
        .expect(201);
      expect(confirmRes.body?.status).toBe('success');
      expect(confirmRes.body?.data?.status).toBe('READY');
      expect(confirmRes.body?.data?.id).toBe(mediaId);
    });

    it('POST /media/upload/confirm with non-existent uploadId returns 404', async () => {
      const res = await request(basePath())
        .post('/media/upload/confirm')
        .set(authHeader(E2E_USER_ID))
        .send({ uploadId: '00000000-0000-4000-8000-000000000000' })
        .expect(404);
      expect(res.body?.status).toBe('error');
    });
  });

  describe('User media – get by id and not found', () => {
    it('GET /media/:id with non-existent id returns 404', async () => {
      const res = await request(basePath())
        .get('/media/00000000-0000-4000-8000-000000000000')
        .set(authHeader(E2E_USER_ID))
        .expect(404);
      expect(res.body?.status).toBe('error');
    });

    it('GET /media/:id with valid id returns 200 and media object', async () => {
      const requestRes = await request(basePath())
        .post('/media/upload/request')
        .set(authHeader(E2E_USER_ID))
        .send({
          filename: 'e2e-get-by-id.jpg',
          mimeType: 'image/jpeg',
          size: 100,
          fileType: 'IMAGE',
        })
        .expect(201);
      const mediaId = requestRes.body?.data?.mediaId;
      expect(mediaId).toBeDefined();

      const res = await request(basePath())
        .get(`/media/${mediaId}`)
        .set(authHeader(E2E_USER_ID))
        .expect(200);
      expect(res.body?.status).toBe('success');
      expect(res.body?.data?.id).toBe(mediaId);
      expect(res.body?.data?.filename).toBe('e2e-get-by-id.jpg');
      expect(res.body?.data?.uploaderId).toBe(E2E_USER_ID);
    });
  });

  describe('User media – direct upload (E2E)', () => {
    it('POST /media/upload/direct with valid file and fileType returns 201 and media with id', async () => {
      const res = await request(basePath())
        .post('/media/upload/direct')
        .set(authHeader(E2E_USER_ID))
        .field('fileType', 'IMAGE')
        .attach('file', Buffer.from('fake-jpeg-content'), 'e2e-direct.jpg')
        .expect(201);
      expect(res.body?.status).toBe('success');
      expect(res.body?.data?.id).toBeDefined();
      expect(res.body?.data?.filename).toBe('e2e-direct.jpg');
      expect(res.body?.data?.uploaderId).toBe(E2E_USER_ID);
      expect(res.body?.data?.status).toBe('READY');
    });
  });

  describe('User media – update metadata and delete', () => {
    it('PATCH /media/:id with valid body returns 200 and updated fields', async () => {
      const requestRes = await request(basePath())
        .post('/media/upload/request')
        .set(authHeader(E2E_USER_ID))
        .send({
          filename: 'e2e-patch-test.jpg',
          mimeType: 'image/jpeg',
          size: 1,
          fileType: 'IMAGE',
        })
        .expect(201);
      const mediaId = requestRes.body?.data?.mediaId;

      const res = await request(basePath())
        .patch(`/media/${mediaId}`)
        .set(authHeader(E2E_USER_ID))
        .send({ filename: 'updated-filename.jpg', description: 'E2E updated' })
        .expect(200);
      expect(res.body?.status).toBe('success');
      expect(res.body?.data?.filename).toBe('updated-filename.jpg');
    });

    it('DELETE /media/:id with own media returns 200 and confirmation', async () => {
      const requestRes = await request(basePath())
        .post('/media/upload/request')
        .set(authHeader(E2E_USER_ID))
        .send({
          filename: 'e2e-delete-me.jpg',
          mimeType: 'image/jpeg',
          size: 1,
          fileType: 'IMAGE',
        })
        .expect(201);
      const mediaId = requestRes.body?.data?.mediaId;

      const res = await request(basePath())
        .delete(`/media/${mediaId}`)
        .set(authHeader(E2E_USER_ID))
        .expect(200);
      expect(res.body?.status).toBe('success');

      await request(basePath()).get(`/media/${mediaId}`).set(authHeader(E2E_USER_ID)).expect(404);
    });

    it('DELETE /media/:id with non-existent id returns 404', async () => {
      const res = await request(basePath())
        .delete('/media/00000000-0000-4000-8000-000000000000')
        .set(authHeader(E2E_USER_ID))
        .expect(404);
      expect(res.body?.status).toBe('error');
    });
  });

  describe('User media – download URL, copy, move, thumbnail, versions', () => {
    it('GET /media/:id/download with valid id returns 200 and downloadUrl, expiresIn', async () => {
      const requestRes = await request(basePath())
        .post('/media/upload/request')
        .set(authHeader(E2E_USER_ID))
        .send({
          filename: 'e2e-download-test.jpg',
          mimeType: 'image/jpeg',
          size: 100,
          fileType: 'IMAGE',
        })
        .expect(201);
      const mediaId = requestRes.body?.data?.mediaId;
      await request(basePath())
        .post('/media/upload/confirm')
        .set(authHeader(E2E_USER_ID))
        .send({ uploadId: mediaId })
        .expect(201);

      const res = await request(basePath())
        .get(`/media/${mediaId}/download`)
        .set(authHeader(E2E_USER_ID))
        .expect(200);
      expect(res.body?.status).toBe('success');
      expect(res.body?.data?.downloadUrl).toBeDefined();
      expect(res.body?.data?.expiresIn).toBe(3600);
    });

    it('POST /media/:id/copy with valid id returns 201 and copied media with id', async () => {
      const requestRes = await request(basePath())
        .post('/media/upload/request')
        .set(authHeader(E2E_USER_ID))
        .send({
          filename: 'e2e-copy-source.jpg',
          mimeType: 'image/jpeg',
          size: 1,
          fileType: 'IMAGE',
        })
        .expect(201);
      const mediaId = requestRes.body?.data?.mediaId;
      await request(basePath())
        .post('/media/upload/confirm')
        .set(authHeader(E2E_USER_ID))
        .send({ uploadId: mediaId })
        .expect(201);

      const res = await request(basePath())
        .post(`/media/${mediaId}/copy`)
        .set(authHeader(E2E_USER_ID))
        .send({})
        .expect(201);
      expect(res.body?.status).toBe('success');
      expect(res.body?.data?.id).toBeDefined();
      expect(res.body?.data?.id).not.toBe(mediaId);
      expect(res.body?.data?.filename).toContain('Copy of');
      expect(res.body?.data?.uploaderId).toBe(E2E_USER_ID);
    });

    it('POST /media/:id/move with destinationFolderId returns 200 and updated media', async () => {
      const requestRes = await request(basePath())
        .post('/media/upload/request')
        .set(authHeader(E2E_USER_ID))
        .send({
          filename: 'e2e-move-test.jpg',
          mimeType: 'image/jpeg',
          size: 1,
          fileType: 'IMAGE',
        })
        .expect(201);
      const mediaId = requestRes.body?.data?.mediaId;
      await request(basePath())
        .post('/media/upload/confirm')
        .set(authHeader(E2E_USER_ID))
        .send({ uploadId: mediaId })
        .expect(201);

      const res = await request(basePath())
        .post(`/media/${mediaId}/move`)
        .set(authHeader(E2E_USER_ID))
        .send({ destinationFolderId: 'folder-e2e-1' })
        .expect(201);
      expect(res.body?.status).toBe('success');
      expect(res.body?.data?.contextType).toBe('folder');
      expect(res.body?.data?.contextId).toBe('folder-e2e-1');
    });

    it('POST /media/:id/regenerate-thumbnail returns 201 and thumbnailGenerated true', async () => {
      const requestRes = await request(basePath())
        .post('/media/upload/request')
        .set(authHeader(E2E_USER_ID))
        .send({
          filename: 'e2e-thumb.jpg',
          mimeType: 'image/jpeg',
          size: 1,
          fileType: 'IMAGE',
        })
        .expect(201);
      const mediaId = requestRes.body?.data?.mediaId;

      const res = await request(basePath())
        .post(`/media/${mediaId}/regenerate-thumbnail`)
        .set(authHeader(E2E_USER_ID))
        .expect(201);
      expect(res.body?.status).toBe('success');
      expect(res.body?.data?.id).toBe(mediaId);
      expect(res.body?.data?.thumbnailGenerated).toBe(true);
    });

    it('GET /media/:id/versions returns 200 and versions array', async () => {
      const requestRes = await request(basePath())
        .post('/media/upload/request')
        .set(authHeader(E2E_USER_ID))
        .send({
          filename: 'e2e-versions.jpg',
          mimeType: 'image/jpeg',
          size: 1,
          fileType: 'IMAGE',
        })
        .expect(201);
      const mediaId = requestRes.body?.data?.mediaId;

      const res = await request(basePath())
        .get(`/media/${mediaId}/versions`)
        .set(authHeader(E2E_USER_ID))
        .expect(200);
      expect(res.body?.status).toBe('success');
      expect(res.body?.data?.id).toBe(mediaId);
      expect(Array.isArray(res.body?.data?.versions)).toBe(true);
    });
  });

  describe('Root upload', () => {
    it('POST /upload with file and fileType returns 201 and media', async () => {
      const res = await request(basePath())
        .post('/upload')
        .set(authHeader(E2E_USER_ID))
        .field('fileType', 'IMAGE')
        .attach('file', Buffer.from('root-upload-content'), 'root-e2e.jpg')
        .expect(201);
      expect(res.body?.status).toBe('success');
      expect(res.body?.data?.id).toBeDefined();
      expect(res.body?.data?.filename).toBe('root-e2e.jpg');
      expect(res.body?.data?.uploaderId).toBe(E2E_USER_ID);
    });
  });

  describe('Admin media', () => {
    it('GET /admin/media without token returns 401', async () => {
      const res = await request(basePath()).get('/admin/media').expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('GET /admin/media with USER token returns 403', async () => {
      const res = await request(basePath())
        .get('/admin/media')
        .set(authHeader(E2E_USER_ID, 'USER'))
        .expect(403);
      expect(res.body?.status).toBe('error');
    });

    it('GET /admin/media with ADMIN token returns 200 and data/pagination', async () => {
      const res = await request(basePath())
        .get('/admin/media')
        .set(authHeader(E2E_ADMIN_ID, 'ADMIN'))
        .expect(200);
      expect(res.body?.status).toBe('success');
      expect(Array.isArray(res.body?.data?.data)).toBe(true);
      expect(res.body?.data?.pagination).toBeDefined();
      expect(typeof res.body?.data?.pagination?.totalItems).toBe('number');
    });

    it('GET /admin/media/storage/analytics with ADMIN token returns 200', async () => {
      const res = await request(basePath())
        .get('/admin/media/storage/analytics')
        .set(authHeader(E2E_ADMIN_ID, 'ADMIN'))
        .expect(200);
      expect(res.body?.status).toBe('success');
    });

    it('GET /admin/media/users/:userId returns 200 and data/pagination for that user', async () => {
      const res = await request(basePath())
        .get(`/admin/media/users/${E2E_USER_ID}`)
        .set(authHeader(E2E_ADMIN_ID, 'ADMIN'))
        .expect(200);
      expect(res.body?.status).toBe('success');
      expect(res.body?.data?.userId).toBe(E2E_USER_ID);
      expect(Array.isArray(res.body?.data?.data)).toBe(true);
      expect(res.body?.data?.pagination).toBeDefined();
    });

    it('GET /admin/media/quarantine returns 200 and data/pagination', async () => {
      const res = await request(basePath())
        .get('/admin/media/quarantine')
        .set(authHeader(E2E_ADMIN_ID, 'ADMIN'))
        .expect(200);
      expect(res.body?.status).toBe('success');
      expect(Array.isArray(res.body?.data?.data)).toBe(true);
      expect(res.body?.data?.pagination).toBeDefined();
    });

    it('GET /admin/media/:id with existing id returns 200 and media details', async () => {
      const requestRes = await request(basePath())
        .post('/media/upload/request')
        .set(authHeader(E2E_USER_ID))
        .send({
          filename: 'e2e-admin-get.jpg',
          mimeType: 'image/jpeg',
          size: 1,
          fileType: 'IMAGE',
        })
        .expect(201);
      const mediaId = requestRes.body?.data?.mediaId;

      const res = await request(basePath())
        .get(`/admin/media/${mediaId}`)
        .set(authHeader(E2E_ADMIN_ID, 'ADMIN'))
        .expect(200);
      expect(res.body?.status).toBe('success');
      expect(res.body?.data?.id).toBe(mediaId);
      expect(res.body?.data?.filename).toBeDefined();
    });

    it('POST /admin/media/cleanup returns 201 and cleaned/bytesFreed', async () => {
      const res = await request(basePath())
        .post('/admin/media/cleanup')
        .set(authHeader(E2E_ADMIN_ID, 'ADMIN'))
        .expect(201);
      expect(res.body?.status).toBe('success');
      expect(typeof res.body?.data?.cleaned).toBe('number');
      expect(typeof res.body?.data?.bytesFreed).toBe('number');
    });

    it('PATCH /admin/media/settings returns 200 and updated settings', async () => {
      const res = await request(basePath())
        .patch('/admin/media/settings')
        .set(authHeader(E2E_ADMIN_ID, 'ADMIN'))
        .send({ maxFileSize: 50_000_000 })
        .expect(200);
      expect(res.body?.status).toBe('success');
      expect(res.body?.data?.updated).toBe(true);
      expect(res.body?.data?.settings?.maxFileSize).toBe(50_000_000);
    });

    it('POST /admin/media/:id/reprocess returns 201 and updated media', async () => {
      const requestRes = await request(basePath())
        .post('/media/upload/request')
        .set(authHeader(E2E_USER_ID))
        .send({
          filename: 'e2e-reprocess.jpg',
          mimeType: 'image/jpeg',
          size: 1,
          fileType: 'IMAGE',
        })
        .expect(201);
      const mediaId = requestRes.body?.data?.mediaId;
      await request(basePath())
        .post('/media/upload/confirm')
        .set(authHeader(E2E_USER_ID))
        .send({ uploadId: mediaId })
        .expect(201);

      const res = await request(basePath())
        .post(`/admin/media/${mediaId}/reprocess`)
        .set(authHeader(E2E_ADMIN_ID, 'ADMIN'))
        .expect(201);
      expect(res.body?.status).toBe('success');
      expect(res.body?.data?.id).toBe(mediaId);
      expect(res.body?.data?.status).toBe('PROCESSING');
    });

    it('DELETE /admin/media/:id as admin force-deletes and returns 200', async () => {
      const requestRes = await request(basePath())
        .post('/media/upload/request')
        .set(authHeader(E2E_USER_ID))
        .send({
          filename: 'e2e-admin-delete-me.jpg',
          mimeType: 'image/jpeg',
          size: 1,
          fileType: 'IMAGE',
        })
        .expect(201);
      const mediaId = requestRes.body?.data?.mediaId;
      await request(basePath())
        .post('/media/upload/confirm')
        .set(authHeader(E2E_USER_ID))
        .send({ uploadId: mediaId })
        .expect(201);

      const res = await request(basePath())
        .delete(`/admin/media/${mediaId}`)
        .set(authHeader(E2E_ADMIN_ID, 'ADMIN'))
        .expect(200);
      expect(res.body?.status).toBe('success');

      const getRes = await request(basePath())
        .get(`/admin/media/${mediaId}`)
        .set(authHeader(E2E_ADMIN_ID, 'ADMIN'))
        .expect(200);
      expect(getRes.body?.data).toBeNull();
    });

    it('POST /admin/media/quarantine/:id/release returns 201 and media with status READY', async () => {
      const requestRes = await request(basePath())
        .post('/media/upload/request')
        .set(authHeader(E2E_USER_ID))
        .send({
          filename: 'e2e-quarantine-release.jpg',
          mimeType: 'image/jpeg',
          size: 1,
          fileType: 'IMAGE',
        })
        .expect(201);
      const mediaId = requestRes.body?.data?.mediaId;
      await request(basePath())
        .post('/media/upload/confirm')
        .set(authHeader(E2E_USER_ID))
        .send({ uploadId: mediaId })
        .expect(201);

      const res = await request(basePath())
        .post(`/admin/media/quarantine/${mediaId}/release`)
        .set(authHeader(E2E_ADMIN_ID, 'ADMIN'))
        .expect(201);
      expect(res.body?.status).toBe('success');
      expect(res.body?.data?.status).toBe('READY');
    });

    it('DELETE /admin/media/quarantine/:id returns 200', async () => {
      const res = await request(basePath())
        .delete('/admin/media/quarantine/00000000-0000-4000-8000-000000000000')
        .set(authHeader(E2E_ADMIN_ID, 'ADMIN'))
        .expect(200);
      expect(res.body?.status).toBe('success');
    });
  });

  describe('Root routes (stats, processing status)', () => {
    it('GET /stats with valid token returns 200 and storage stats', async () => {
      const res = await request(basePath()).get('/stats').set(authHeader(E2E_USER_ID)).expect(200);
      expect(res.body?.status).toBe('success');
      expect(typeof res.body?.data?.totalUsedBytes).toBe('number');
      expect(typeof res.body?.data?.quotaBytes).toBe('number');
    });

    it('GET /:id/status with valid media id returns 200 and status', async () => {
      const requestRes = await request(basePath())
        .post('/media/upload/request')
        .set(authHeader(E2E_USER_ID))
        .send({
          filename: 'e2e-status-test.jpg',
          mimeType: 'image/jpeg',
          size: 1,
          fileType: 'IMAGE',
        })
        .expect(201);
      const mediaId = requestRes.body?.data?.mediaId;

      const res = await request(basePath())
        .get(`/${mediaId}/status`)
        .set(authHeader(E2E_USER_ID))
        .expect(200);
      expect(res.body?.status).toBe('success');
      expect(res.body?.data?.id).toBe(mediaId);
      expect(['PENDING', 'PROCESSING', 'READY', 'FAILED', 'QUARANTINED']).toContain(
        res.body?.data?.status,
      );
    });
  });
});
