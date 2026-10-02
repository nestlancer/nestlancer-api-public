import {
  toAdminSessionItem,
  toAdminUserDetail,
  toAdminUserListItem,
} from '../../../src/mappers/admin-user.mapper';

describe('admin-user.mapper', () => {
  const baseUser = {
    id: 'u1',
    email: 'a@b.com',
    firstName: 'A',
    lastName: 'B',
    role: 'USER',
    status: 'ACTIVE',
    emailVerified: true,
    avatar: null,
    phone: null,
    marketingConsent: false,
    lastLoginAt: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    authConfig: { twoFactorEnabled: false, mustChangePassword: true, twoFactorSecret: 'x' },
    preferences: null,
  };

  it('toAdminUserListItem omits secrets', () => {
    const item = toAdminUserListItem(baseUser);
    expect(item.id).toBe('u1');
    expect(item).not.toHaveProperty('passwordHash');
    expect(item).not.toHaveProperty('twoFactorSecret');
  });

  it('toAdminUserDetail exposes mustChangePassword only', () => {
    const detail = toAdminUserDetail(baseUser);
    expect(detail.mustChangePassword).toBe(true);
    expect(detail).not.toHaveProperty('passwordHash');
    expect(detail).not.toHaveProperty('authConfig');
  });

  it('toAdminSessionItem omits token', () => {
    const session = toAdminSessionItem({
      id: 's1',
      token: 'bearer-secret',
      ip: '1.1.1.1',
      userAgent: 'jest',
      deviceInfo: null,
      expiresAt: new Date(),
      lastActiveAt: new Date(),
      createdAt: new Date(),
    });
    expect(session.id).toBe('s1');
    expect(session).not.toHaveProperty('token');
  });
});
