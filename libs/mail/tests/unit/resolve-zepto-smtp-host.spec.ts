import { resolveZeptoSmtpHost, ZEPTOMAIL_SMTP_BY_DC } from '../../src/mail.service';

describe('resolveZeptoSmtpHost', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.ZEPTOMAIL_SMTP_HOST;
    delete process.env.ZEPTOMAIL_DC;
  });

  afterAll(() => {
    process.env = env;
  });

  it('prefers explicit smtpHost from options', () => {
    expect(resolveZeptoSmtpHost({ smtpHost: 'smtp.zeptomail.in', token: 'x' })).toBe(
      'smtp.zeptomail.in',
    );
  });

  it('prefers ZEPTOMAIL_SMTP_HOST env', () => {
    process.env.ZEPTOMAIL_SMTP_HOST = 'smtp.zeptomail.eu';
    expect(resolveZeptoSmtpHost()).toBe('smtp.zeptomail.eu');
  });

  it('maps ZEPTOMAIL_DC to regional host', () => {
    process.env.ZEPTOMAIL_DC = 'in';
    expect(resolveZeptoSmtpHost()).toBe(ZEPTOMAIL_SMTP_BY_DC.in);
  });

  it('defaults to US host', () => {
    expect(resolveZeptoSmtpHost()).toBe('smtp.zeptomail.com');
  });
});
