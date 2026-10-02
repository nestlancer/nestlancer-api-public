import axios from 'axios';
import { setupApp, teardownApp, getAppUrl, getGlobalPrefix } from './setup';

describe('Webhooks Service (E2E)', () => {
  let baseUrl: string;
  const prefix = getGlobalPrefix();

  beforeAll(async () => {
    await setupApp();
    baseUrl = `${getAppUrl()}/${prefix}`;
  });

  afterAll(async () => {
    await teardownApp();
  });

  it('GET /health returns 200 with status ok', async () => {
    const res = await axios.get(`${baseUrl}/health`, {
      validateStatus: () => true,
    });
    expect(res.status).toBe(200);
    expect(res.data?.data?.status).toBe('ok');
    expect(res.data?.data?.service).toBe('webhooks-inbound');
  });
});
