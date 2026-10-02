import {
  inferPortalFromOrigin,
  resolveLoginPortal,
} from '../../../src/utils/portal-binding';

describe('portal-binding', () => {
  it('infers client portal from app origin', () => {
    expect(inferPortalFromOrigin('https://app.nestlancer.com')).toBe('client');
  });

  it('infers admin portal from admin origin', () => {
    expect(inferPortalFromOrigin('https://admin.nestlancer.com')).toBe('admin');
  });

  it('lets Origin win over a spoofed body portal', () => {
    expect(
      resolveLoginPortal({
        bodyPortal: 'admin',
        origin: 'https://app.nestlancer.com',
      }),
    ).toBe('client');
  });

  it('does not treat auth upstream Host :3001 as admin when Origin is app', () => {
    expect(
      resolveLoginPortal({
        bodyPortal: 'client',
        origin: 'https://app.nestlancer.com',
        host: 'nl-prod-auth:3001',
      }),
    ).toBe('client');
  });

  it('uses body portal when Origin/Host are absent', () => {
    expect(resolveLoginPortal({ bodyPortal: 'admin' })).toBe('admin');
    expect(resolveLoginPortal({ bodyPortal: 'client' })).toBe('client');
  });

  it('defaults to client when nothing is provided', () => {
    expect(resolveLoginPortal({})).toBe('client');
  });
});
