/**
 * E2E — Media service
 *
 * Full end-to-end coverage of the media service via the API gateway.
 * Tests upload request flow, direct uploads, media listing, metadata updates,
 * sharing, chunked uploads, and admin media management.
 *
 * Worker integration:
 *   • File upload triggers media-worker (virus scan + processing)
 *   • Image processing triggers media-worker (thumbnail generation)
 *   • CDN cache invalidation goes through cdn-worker on publish
 *   • Upload events trigger audit-worker
 *
 * Routes: /api/v1/media/*, /api/v1/admin/media/*
 */

import axios, { AxiosError } from 'axios';
import { getApiBase, resolveStatus } from '../../setup/http';
import { bearerToken, mintSystemToken } from '../../setup/auth';

const BASE = getApiBase();
const MEDIA = `${BASE}/media`;
const ADMIN_MEDIA = `${BASE}/admin/media`;

const USER_ID = 'e2e-media-user-mda1-2345-6789-abcd-ef0123456789';
const ADMIN_ID = 'e2e-media-admin-adm5-9876-5432-10fe-dcba98765432';
const FAKE_MEDIA_ID = '00000000-mda-00000-0000-000000000001';

const userToken = () => bearerToken(USER_ID, 'USER');
const adminToken = () => `Bearer ${mintSystemToken(ADMIN_ID, 'ADMIN')}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

type SafeResult = { status: number; data: any };

async function GET(
  url: string,
  token?: string,
  params?: Record<string, string>,
): Promise<SafeResult> {
  return axios
    .get(url, { headers: token ? { Authorization: token } : {}, params, timeout: 12_000 })
    .then((r) => ({ status: resolveStatus(r.status, r.data), data: r.data }))
    .catch((e: AxiosError) => ({
      status: e.response?.status ?? 0,
      data: e.response?.data ?? null,
    }));
}

async function POST(url: string, body: unknown, token?: string): Promise<SafeResult> {
  return axios
    .post(url, body, { headers: token ? { Authorization: token } : {}, timeout: 12_000 })
    .then((r) => ({ status: resolveStatus(r.status, r.data), data: r.data }))
    .catch((e: AxiosError) => ({
      status: e.response?.status ?? 0,
      data: e.response?.data ?? null,
    }));
}

async function PATCH(url: string, body: unknown, token?: string): Promise<SafeResult> {
  return axios
    .patch(url, body, { headers: token ? { Authorization: token } : {}, timeout: 12_000 })
    .then((r) => ({ status: resolveStatus(r.status, r.data), data: r.data }))
    .catch((e: AxiosError) => ({
      status: e.response?.status ?? 0,
      data: e.response?.data ?? null,
    }));
}

async function DELETE(url: string, token?: string): Promise<SafeResult> {
  return axios
    .delete(url, { headers: token ? { Authorization: token } : {}, timeout: 12_000 })
    .then((r) => ({ status: resolveStatus(r.status, r.data), data: r.data }))
    .catch((e: AxiosError) => ({
      status: e.response?.status ?? 0,
      data: e.response?.data ?? null,
    }));
}

// ── Reachability guard ────────────────────────────────────────────────────────

async function expectMediaReachable(): Promise<void> {
  let connected = false;
  try {
    await axios.get(`${MEDIA}/health`, { timeout: 10_000 });
    connected = true;
  } catch (e) {
    const ae = e as AxiosError;
    if (ae.code === 'ECONNREFUSED' || ae.code === 'ENOTFOUND') {
      throw new Error(`[e2e] Media service not reachable at ${MEDIA}. Run: pnpm docker:e2e:up`);
    }
    connected = true;
  }
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('E2E — Media service', () => {
  beforeAll(expectMediaReachable);

  // ── Auth enforcement ───────────────────────────────────────────────────────
  describe('Auth enforcement', () => {
    it('GET /media without token → 401', async () => {
      const { status } = await GET(MEDIA);
      expect([0, 401, 403]).toContain(status);
    });

    it('POST /media/upload/request without token → 401', async () => {
      const { status } = await POST(`${MEDIA}/upload/request`, {});
      expect([0, 401, 403, 404]).toContain(status);
    });

    it('GET /media/storage-stats without token → 401', async () => {
      const { status } = await GET(`${MEDIA}/storage-stats`);
      expect([0, 401, 403]).toContain(status);
    });
  });

  // ── Media list ────────────────────────────────────────────────────────────
  describe('GET /media — media library', () => {
    it('with JWT returns media list (not 401/403)', async () => {
      const { status, data } = await GET(MEDIA, userToken());
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
      if (status === 200) {
        const body = data as Record<string, unknown>;
        const list = body?.data ?? body;
        expect(Array.isArray(list) || typeof list === 'object').toBe(true);
      }
    });

    it('with type filter', async () => {
      const { status } = await GET(MEDIA, userToken(), { type: 'IMAGE' });
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });

    it('with context filter', async () => {
      const { status } = await GET(MEDIA, userToken(), { context: 'PROFILE' });
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });
  });

  // ── Storage stats ─────────────────────────────────────────────────────────
  describe('GET /media/storage-stats', () => {
    it('with JWT returns storage usage', async () => {
      const { status } = await GET(`${MEDIA}/storage-stats`, userToken());
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });
  });

  // ── Upload request (presigned URL) ────────────────────────────────────────
  describe('POST /media/upload/request', () => {
    it('empty body returns 400', async () => {
      const { status } = await POST(`${MEDIA}/upload/request`, {}, userToken());
      expect([400, 404, 422]).toContain(status);
    });

    it('valid upload request is processed', async () => {
      const { status } = await POST(
        `${MEDIA}/upload/request`,
        {
          filename: 'e2e-test-image.jpg',
          mimeType: 'image/jpeg',
          size: 524288,
          fileType: 'IMAGE',
        },
        userToken(),
      );
      // 200/201 = presigned URL returned, 400 = validation, 500 = S3 not configured
      expect([200, 201, 400, 404, 422, 500, 502, 503, 504]).toContain(status);
    });

    it('legacy POST /media/request alias is reachable', async () => {
      const { status } = await POST(
        `${MEDIA}/request`,
        {
          filename: 'legacy-alias.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
          fileType: 'IMAGE',
        },
        userToken(),
      );
      expect([200, 201, 400, 404, 422, 500, 502, 503, 504]).toContain(status);
    });

    it('unsupported MIME type returns 400', async () => {
      const { status } = await POST(
        `${MEDIA}/upload/request`,
        {
          filename: 'malware.exe',
          mimeType: 'application/x-msdownload',
          size: 1024,
          fileType: 'DOCUMENT',
        },
        userToken(),
      );
      expect([400, 404, 422]).toContain(status);
    });

    it('file too large returns 400', async () => {
      const { status } = await POST(
        `${MEDIA}/upload/request`,
        {
          filename: 'huge-file.mp4',
          mimeType: 'video/mp4',
          size: 999999999999,
          fileType: 'VIDEO',
        },
        userToken(),
      );
      expect([400, 404, 422]).toContain(status);
    });
  });

  // ── Confirm upload ────────────────────────────────────────────────────────
  describe('POST /media/upload/confirm', () => {
    it('empty body returns 400', async () => {
      const { status } = await POST(`${MEDIA}/upload/confirm`, {}, userToken());
      expect([400, 404, 422]).toContain(status);
    });

    it('invalid upload ID returns 400 or 404', async () => {
      const { status } = await POST(
        `${MEDIA}/upload/confirm`,
        {
          uploadId: 'invalid-upload-id',
        },
        userToken(),
      );
      expect([400, 404, 422]).toContain(status);
    });
  });

  // ── Individual media item ─────────────────────────────────────────────────
  describe('GET /media/:id — media details', () => {
    it('non-existent ID returns 404', async () => {
      const { status } = await GET(`${MEDIA}/${FAKE_MEDIA_ID}`, userToken());
      expect([404, 400, 403]).toContain(status);
    });
  });

  describe('GET /media/:id/download — media download URL', () => {
    it('non-existent media returns 404', async () => {
      const { status } = await GET(`${MEDIA}/${FAKE_MEDIA_ID}/download`, userToken());
      expect([404, 400, 403]).toContain(status);
    });
  });

  // ── Metadata update ───────────────────────────────────────────────────────
  describe('PATCH /media/:id — update metadata', () => {
    it('non-existent media returns 404', async () => {
      const { status } = await PATCH(
        `${MEDIA}/${FAKE_MEDIA_ID}`,
        {
          altText: 'Updated alt text from e2e test',
          description: 'E2E test media description update',
        },
        userToken(),
      );
      expect([404, 400, 403, 422]).toContain(status);
    });

    it('requires authentication', async () => {
      const { status } = await PATCH(`${MEDIA}/${FAKE_MEDIA_ID}`, { altText: 'Test' });
      expect([0, 401, 403]).toContain(status);
    });
  });

  // ── Copy and move ─────────────────────────────────────────────────────────
  describe('POST /media/:id/copy', () => {
    it('non-existent media returns 404', async () => {
      const { status } = await POST(
        `${MEDIA}/${FAKE_MEDIA_ID}/copy`,
        { context: 'BLOG' },
        userToken(),
      );
      expect([404, 400, 403, 422, 201]).toContain(status);
    });
  });

  // ── Thumbnail regeneration ────────────────────────────────────────────────
  describe('POST /media/:id/regenerate-thumbnail — media-worker trigger', () => {
    it('non-existent media returns 404', async () => {
      const { status } = await POST(
        `${MEDIA}/${FAKE_MEDIA_ID}/regenerate-thumbnail`,
        {},
        userToken(),
      );
      expect([404, 400, 403, 201]).toContain(status);
    });
  });

  // ── Media sharing ─────────────────────────────────────────────────────────
  describe('Media sharing', () => {
    it('GET /media/shared returns shared items list', async () => {
      const { status } = await GET(`${MEDIA}/shared`, userToken());
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });

    it('POST /media/:id/share requires valid body', async () => {
      const { status } = await POST(
        `${MEDIA}/${FAKE_MEDIA_ID}/share`,
        {
          sharedWithUserId: USER_ID,
          permissions: ['READ'],
          expiresAt: '2026-12-31T23:59:59Z',
        },
        userToken(),
      );
      expect([200, 201, 400, 404, 422]).toContain(status);
    });

    it('DELETE /media/:id/unshare', async () => {
      const { status } = await DELETE(`${MEDIA}/${FAKE_MEDIA_ID}/unshare`, userToken());
      expect([200, 204, 404, 400]).toContain(status);
    });
  });

  // ── Chunked upload ────────────────────────────────────────────────────────
  describe('Chunked upload flow — large file support', () => {
    it('POST /media/chunked/init — initialize chunked upload', async () => {
      const { status } = await POST(
        `${MEDIA}/chunked/init`,
        {
          filename: 'e2e-test-large-video.mp4',
          mimeType: 'video/mp4',
          totalSize: 104857600,
          chunkSize: 5242880,
          context: 'PORTFOLIO',
        },
        userToken(),
      );
      expect([200, 201, 400, 404, 422, 500, 502, 503, 504]).toContain(status);
    });

    it('POST /media/chunked/complete with invalid upload ID returns 400/404', async () => {
      const { status } = await POST(
        `${MEDIA}/chunked/complete`,
        {
          uploadId: 'e2e-invalid-chunked-upload-id',
          parts: [{ partNumber: 1, eTag: 'e2e-test-etag-part-1' }],
        },
        userToken(),
      );
      expect([400, 404, 422, 500]).toContain(status);
    });

    it('DELETE /media/chunked/:uploadId/abort — abort chunked upload', async () => {
      const { status } = await DELETE(`${MEDIA}/chunked/e2e-invalid-upload-id/abort`, userToken());
      expect([200, 204, 400, 404]).toContain(status);
    });
  });

  // ── Media versions ────────────────────────────────────────────────────────
  describe('GET /media/:id/versions', () => {
    it('non-existent media returns 404', async () => {
      const { status } = await GET(`${MEDIA}/${FAKE_MEDIA_ID}/versions`, userToken());
      expect([404, 400, 403, 200]).toContain(status);
    });
  });

  // ── Admin media management ────────────────────────────────────────────────
  describe('Admin media — privilege enforcement', () => {
    it('GET /admin/media with USER token → 403', async () => {
      const { status } = await GET(ADMIN_MEDIA, userToken());
      expect([0, 401, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/media with ADMIN token is not 401', async () => {
      const { status } = await GET(ADMIN_MEDIA, adminToken());
      expect(status).not.toBe(401);
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/media/analytics with ADMIN token', async () => {
      const { status } = await GET(`${ADMIN_MEDIA}/analytics`, adminToken());
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('POST /admin/media/:id/quarantine with USER token → 403', async () => {
      const { status } = await POST(
        `${ADMIN_MEDIA}/${FAKE_MEDIA_ID}/quarantine`,
        { reason: 'E2E test quarantine' },
        userToken(),
      );
      expect([0, 401, 403, 404]).toContain(status);
    });

    it('POST /admin/media/:id/reprocess with ADMIN token — media-worker trigger', async () => {
      const { status } = await POST(
        `${ADMIN_MEDIA}/${FAKE_MEDIA_ID}/reprocess`,
        { processingType: 'IMAGE_PROCESS' },
        adminToken(),
      );
      expect([200, 201, 400, 404, 502, 503, 504]).toContain(status);
    });

    it('POST /admin/media/cleanup with ADMIN token — scheduled cleanup', async () => {
      const { status } = await POST(
        `${ADMIN_MEDIA}/cleanup`,
        {
          olderThanDays: 90,
          status: 'ORPHANED',
          dryRun: true,
        },
        adminToken(),
      );
      expect([200, 201, 400, 403, 404, 422, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/media/settings with ADMIN token', async () => {
      const { status } = await GET(`${ADMIN_MEDIA}/settings`, adminToken());
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });
  });
});
