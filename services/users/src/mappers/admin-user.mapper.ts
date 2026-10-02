import { normalizeIp } from '@nestlancer/common';

/** Safe admin API shapes — never expose password hashes, secrets, or session tokens. */

export type AdminUserListItem = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: Date;
};

export type AdminUserDetail = AdminUserListItem & {
  avatar: string | null;
  phone: string | null;
  marketingConsent: boolean;
  lastLoginAt: Date | null;
  deletedAt: Date | null;
  updatedAt: Date;
  mustChangePassword: boolean;
  preferences?: Record<string, unknown> | null;
};

export type AdminSessionItem = {
  id: string;
  ip: string | null;
  userAgent: string | null;
  deviceInfo: unknown;
  expiresAt: Date;
  lastActiveAt: Date;
  createdAt: Date;
};

export function toAdminUserListItem(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  emailVerified: boolean;
  createdAt: Date;
  authConfig?: { twoFactorEnabled?: boolean } | null;
}): AdminUserListItem {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    twoFactorEnabled: user.authConfig?.twoFactorEnabled ?? false,
    createdAt: user.createdAt,
  };
}

export function toAdminUserDetail(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  emailVerified: boolean;
  twoFactorEnabled?: boolean;
  avatar?: string | null;
  phone?: string | null;
  marketingConsent?: boolean;
  lastLoginAt?: Date | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  authConfig?: {
    twoFactorEnabled?: boolean;
    mustChangePassword?: boolean;
  } | null;
  preferences?: Record<string, unknown> | null;
}): AdminUserDetail {
  const base = toAdminUserListItem(user);
  return {
    ...base,
    avatar: user.avatar ?? null,
    phone: user.phone ?? null,
    marketingConsent: user.marketingConsent ?? false,
    lastLoginAt: user.lastLoginAt ?? null,
    deletedAt: user.deletedAt ?? null,
    updatedAt: user.updatedAt,
    mustChangePassword: user.authConfig?.mustChangePassword ?? false,
    preferences: user.preferences ?? null,
  };
}

export function toAdminSessionItem(session: {
  id: string;
  ip: string | null;
  userAgent: string | null;
  deviceInfo: unknown;
  expiresAt: Date;
  lastActiveAt: Date;
  createdAt: Date;
}): AdminSessionItem {
  return {
    id: session.id,
    ip: normalizeIp(session.ip) ?? session.ip,
    userAgent: session.userAgent,
    deviceInfo: session.deviceInfo,
    expiresAt: session.expiresAt,
    lastActiveAt: session.lastActiveAt,
    createdAt: session.createdAt,
  };
}
