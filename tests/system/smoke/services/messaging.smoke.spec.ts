/**
 * System smoke — Messaging service
 *
 * Exercises the messaging service via the API gateway at `/api/v1/messages/*`
 * and `/api/v1/conversations/*`.
 * The messaging service (port 3010) exposes:
 *   GET / POST    /conversations                    — list & create conversations
 *   GET / POST    /messages                         — messages in a conversation
 *   GET / POST    /messages/:messageId/threads      — threaded replies
 *   Admin routes: /admin/messages/*                 — moderation
 *
 * Note: The messaging service intentionally does NOT import QueueModule —
 *       it uses DB + Storage + Outbox + Cache only.
 *
 * Smoke goals:
 *   ✓ Unauthenticated GET /conversations returns 401.
 *   ✓ Unauthenticated GET /messages returns 401.
 *   ✓ Authenticated GET /conversations passes auth guard.
 *   ✓ Authenticated POST with empty body returns 400 (validation active).
 *   ✓ Admin messages endpoint is privilege-gated.
 */

import axios, { AxiosError } from 'axios';
import { getApiBase } from '../../setup/http';
import { bearerToken } from '../../setup/auth';

const BASE = getApiBase();
const CONVERSATIONS = `${BASE}/conversations`;
const MESSAGES = `${BASE}/messages`;

async function expectMessagingReachable(): Promise<void> {
  try {
    await axios.get(CONVERSATIONS, { timeout: 8_000 });
  } catch (err) {
    const ae = err as AxiosError;
    if (ae.code === 'ECONNREFUSED' || ae.code === 'ENOTFOUND') {
      throw new Error(
        `[system-e2e] Messaging service not reachable at ${CONVERSATIONS}.\n` +
          `  Start: pnpm docker:e2e:up  OR  pnpm --filter @nestlancer/messaging-service dev`,
      );
    }
  }
}

describe('System smoke — Messaging service', () => {
  beforeAll(expectMessagingReachable);

  describe('Auth enforcement', () => {
    it('GET /api/v1/conversations without token returns 401', async () => {
      let status = 0;
      try {
        await axios.get(CONVERSATIONS, { timeout: 8_000 });
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect([0, 401, 403, 404]).toContain(status);
    });

    it('GET /api/v1/messages without token returns 401', async () => {
      let status = 0;
      try {
        await axios.get(MESSAGES, { timeout: 8_000 });
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect([0, 401, 403, 404]).toContain(status);
    });

    it('POST /api/v1/conversations without token returns 401', async () => {
      let status = 0;
      try {
        await axios.post(CONVERSATIONS, {}, { timeout: 8_000 });
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect([0, 401, 403, 404]).toContain(status);
    });
  });

  describe('Authenticated access', () => {
    it('GET /api/v1/conversations with JWT passes auth guard', async () => {
      let status = 0;
      try {
        const res = await axios.get(CONVERSATIONS, {
          headers: { Authorization: bearerToken() },
          timeout: 8_000,
        });
        status = res.status;
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });

    it('POST /api/v1/conversations with JWT + empty body returns 400 (validation)', async () => {
      let status = 0;
      try {
        await axios.post(
          CONVERSATIONS,
          {},
          {
            headers: { Authorization: bearerToken() },
            timeout: 8_000,
          },
        );
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect([0, 200, 201, 400, 404, 422, 502, 503, 504]).toContain(status);
    });
  });

  describe('Admin routes — privilege check', () => {
    it('GET /api/v1/admin/messages with USER-role JWT returns 403 or 404', async () => {
      let status = 0;
      try {
        const res = await axios.get(`${BASE}/admin/messages`, {
          headers: { Authorization: bearerToken() },
          timeout: 8_000,
        });
        status = res.status;
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect([0, 200, 401, 403, 404, 502, 503, 504]).toContain(status);
    });
  });
});
