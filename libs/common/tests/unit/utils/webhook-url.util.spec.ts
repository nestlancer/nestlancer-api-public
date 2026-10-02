import { assertSafeWebhookUrl } from '../../../src/utils/webhook-url.util';

describe('assertSafeWebhookUrl (NL-BUG-HOOK-001)', () => {
  it('rejects link-local metadata IP', async () => {
    await expect(assertSafeWebhookUrl('http://169.254.169.254/latest/meta-data/')).rejects.toThrow(
      /private or link-local/i,
    );
  });

  it('rejects RFC1918 addresses', async () => {
    await expect(assertSafeWebhookUrl('http://10.0.0.5/internal')).rejects.toThrow(
      /private or link-local/i,
    );
  });

  it('rejects localhost hostname', async () => {
    await expect(assertSafeWebhookUrl('http://localhost:3000/hook')).rejects.toThrow(/not allowed/i);
  });

  it('allows a public https URL', async () => {
    await expect(assertSafeWebhookUrl('https://example.com/hooks/nestlancer')).resolves.toBeUndefined();
  });
});
