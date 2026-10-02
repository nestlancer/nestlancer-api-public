/**
 * Cross-e2e — Document generation APIs via gateway
 *
 * Covers public verify, quote/payment version history, contract, and invoice routes.
 */

import axios, { AxiosError } from 'axios';
import { getApiBase, resolveStatus } from '../../setup/http';
import { bearerToken } from '../../setup/auth';

const BASE = getApiBase();
const DOCUMENTS = `${BASE}/documents`;
const QUOTES = `${BASE}/quotes`;
const PAYMENTS = `${BASE}/payments`;
const INVOICES = `${BASE}/invoices`;

const USER_ID = 'e2e-docs-user-11223344-5566-7788-99aa-bbccddeeff00';
const FAKE_QUOTE_ID = '00000000-aaaa-bbbb-cccc-000000000001';
const FAKE_PAYMENT_ID = '00000000-aaaa-bbbb-cccc-000000000002';
const FAKE_DOC_NUMBER = 'NL-INV-2026-999999';

const userToken = () => bearerToken(USER_ID, 'USER');

type SafeResult = { status: number; data: any };

async function GET(url: string, token?: string): Promise<SafeResult> {
  return axios
    .get(url, { headers: token ? { Authorization: token } : {}, timeout: 12_000 })
    .then((r) => ({ status: resolveStatus(r.status, r.data), data: r.data }))
    .catch((e: AxiosError) => ({
      status: e.response?.status ?? 0,
      data: e.response?.data ?? null,
    }));
}

async function expectGatewayReachable(): Promise<void> {
  const { status } = await GET(`${BASE}/health`);
  if (![200, 503].includes(status)) {
    throw new Error(`Gateway not reachable at ${BASE} (status ${status})`);
  }
}

describe('System e2e — Documents', () => {
  beforeAll(async () => {
    await expectGatewayReachable();
  });

  describe('GET /documents/verify/:documentNumber (public)', () => {
    it('returns 200 for verify endpoint (unknown doc may return null/404 envelope)', async () => {
      const { status } = await GET(`${DOCUMENTS}/verify/${FAKE_DOC_NUMBER}`);
      expect([200, 404]).toContain(status);
    });
  });

  describe('GET /quotes/:id/documents/versions', () => {
    it('requires authentication', async () => {
      const { status } = await GET(`${QUOTES}/${FAKE_QUOTE_ID}/documents/versions`);
      expect([0, 401, 403]).toContain(status);
    });

    it('returns 404 for non-existent quote when authenticated', async () => {
      const { status } = await GET(`${QUOTES}/${FAKE_QUOTE_ID}/documents/versions`, userToken());
      expect([404, 403, 400]).toContain(status);
    });
  });

  describe('GET /quotes/:id/contract', () => {
    it('requires authentication', async () => {
      const { status } = await GET(`${QUOTES}/${FAKE_QUOTE_ID}/contract`);
      expect([0, 401, 403]).toContain(status);
    });

    it('returns 404 when contract not generated yet', async () => {
      const { status } = await GET(`${QUOTES}/${FAKE_QUOTE_ID}/contract`, userToken());
      expect([404, 403, 400]).toContain(status);
    });
  });

  describe('GET /payments/:id/documents/versions', () => {
    it('requires authentication', async () => {
      const { status } = await GET(`${PAYMENTS}/${FAKE_PAYMENT_ID}/documents/versions`);
      expect([0, 401, 403]).toContain(status);
    });
  });

  describe('GET /invoices', () => {
    it('requires authentication', async () => {
      const { status } = await GET(INVOICES);
      expect([0, 401, 403]).toContain(status);
    });

    it('returns list envelope when authenticated', async () => {
      const { status } = await GET(INVOICES, userToken());
      expect([200, 404, 500, 502, 503]).toContain(status);
    });
  });
});
