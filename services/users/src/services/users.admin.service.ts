import { Injectable, Logger } from '@nestjs/common';
import {
  PrismaWriteService,
  PrismaReadService,
  readMustChangePassword,
  setMustChangePassword,
} from '@nestlancer/database';
import { BusinessLogicException, UserRole, UserStatus } from '@nestlancer/common';
import { publishAuditEntrySafe } from '@nestlancer/audit';
import { QueuePublisherService } from '@nestlancer/queue';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { AdminUpdateUserDto } from '../dto/admin-update-user.dto';
import { AdminBulkOperationDto } from '../dto/admin-bulk-operation.dto';
import {
  toAdminSessionItem,
  toAdminUserDetail,
  toAdminUserListItem,
} from '../mappers/admin-user.mapper';

@Injectable()
export class UsersAdminService {
  private readonly logger = new Logger(UsersAdminService.name);

  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly config: ConfigService,
    private readonly queuePublisher: QueuePublisherService,
  ) {}

  async listUsers(page: number, limit: number, status?: string, role?: string) {
    const where: Record<string, unknown> = {};
    if (status) where.status = this.resolveListStatus(status);
    if (role) where.role = this.resolveListRole(role);

    const [users, total] = await Promise.all([
      this.prismaRead.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { authConfig: true },
      }),
      this.prismaRead.user.count({ where }),
    ]);

    return {
      data: users.map(toAdminUserListItem),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** Map legacy aliases (CLIENT) and reject unknown roles before Prisma (avoids 500). */
  private resolveListRole(role: string): UserRole {
    const normalized = role.trim().toUpperCase();
    if (normalized === 'CLIENT' || normalized === UserRole.USER) return UserRole.USER;
    if (normalized === UserRole.ADMIN) return UserRole.ADMIN;
    throw new BusinessLogicException(`Invalid role filter: ${role}`, 'USER_020');
  }

  private resolveListStatus(status: string): UserStatus {
    const normalized = status.trim().toUpperCase();
    const allowed = Object.values(UserStatus) as string[];
    if (!allowed.includes(normalized)) {
      throw new BusinessLogicException(`Invalid status filter: ${status}`, 'USER_020');
    }
    return normalized as UserStatus;
  }

  async searchUsers(query: string, page: number, limit: number) {
    const where = {
      OR: [
        { email: { contains: query, mode: 'insensitive' as const } },
        { firstName: { contains: query, mode: 'insensitive' as const } },
        { lastName: { contains: query, mode: 'insensitive' as const } },
      ],
    };

    const [users, total] = await Promise.all([
      this.prismaRead.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { authConfig: true },
      }),
      this.prismaRead.user.count({ where }),
    ]);

    return {
      data: users.map(toAdminUserListItem),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUserDetails(userId: string) {
    const user = await this.prismaRead.user.findUnique({
      where: { id: userId },
      include: { preferences: true, authConfig: true },
    });

    if (!user) {
      throw new BusinessLogicException('User not found', 'USER_001');
    }

    return this.mapToAdminDetail(user);
  }

  async updateUser(userId: string, dto: AdminUpdateUserDto, adminId?: string) {
    if (dto.status === UserStatus.SUSPENDED || dto.status === UserStatus.DELETED) {
      await this.assertSoleAdminSafe(
        userId,
        dto.status === UserStatus.DELETED ? 'delete' : 'suspend',
      );
    }

    const data: Record<string, string> = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.status !== undefined) data.status = dto.status;

    if (Object.keys(data).length === 0) {
      throw new BusinessLogicException('No valid fields to update', 'USER_012');
    }

    const user = await this.prismaWrite.user.update({
      where: { id: userId },
      data,
      include: { authConfig: true, preferences: true },
    });

    if (dto.status === UserStatus.SUSPENDED) {
      await this.revokeAllSessions(userId);
    }

    await this.prismaWrite.outbox.create({
      data: {
        type: 'ADMIN_USER_UPDATED',
        payload: { userId, fields: Object.keys(data) },
      },
    });

    this.recordAdminAction(
      'USER_UPDATED',
      `Admin updated user profile fields: ${Object.keys(data).join(', ')}`,
      {
        adminId,
        targetUserId: userId,
        metadata: { fields: Object.keys(data) },
      },
    );

    return this.mapToAdminDetail(user);
  }

  async changeRole(userId: string, role: UserRole, adminId?: string) {
    await this.assertSingleAdminRole(userId, role);

    const user = await this.prismaWrite.user.update({
      where: { id: userId },
      data: { role: role as any },
      include: { authConfig: true, preferences: true },
    });

    await this.prismaWrite.outbox.create({
      data: {
        type: 'ADMIN_USER_ROLE_CHANGED',
        payload: { userId, role },
      },
    });

    this.recordAdminAction('USER_ROLE_CHANGED', `Admin changed user role to ${role}`, {
      adminId,
      targetUserId: userId,
      metadata: { role },
    });

    return this.mapToAdminDetail(user);
  }

  async changeUserStatus(userId: string, status: UserStatus, adminId?: string) {
    if (status === UserStatus.SUSPENDED || status === UserStatus.DELETED) {
      await this.assertSoleAdminSafe(userId, status === UserStatus.DELETED ? 'delete' : 'suspend');
    }

    const user = await this.prismaWrite.user.update({
      where: { id: userId },
      data: { status: status as any },
      include: { authConfig: true, preferences: true },
    });

    if (status === UserStatus.SUSPENDED || status === UserStatus.DELETED) {
      await this.revokeAllSessions(userId);
    }

    await this.prismaWrite.outbox.create({
      data: {
        type: 'ADMIN_USER_STATUS_CHANGED',
        payload: { userId, status },
      },
    });

    this.recordAdminAction('USER_STATUS_CHANGED', `Admin changed user status to ${status}`, {
      adminId,
      targetUserId: userId,
      metadata: { status },
    });

    return this.mapToAdminDetail(user);
  }

  async forcePasswordReset(userId: string, adminId?: string) {
    await this.ensureUserExists(userId);

    await this.prismaWrite.authConfig.upsert({
      where: { userId },
      create: { userId },
      update: { failedLoginAttempts: 0, lockoutUntil: null },
    });
    await setMustChangePassword(this.prismaWrite, userId, true);

    await this.revokeAllSessions(userId);

    await this.prismaWrite.outbox.create({
      data: {
        type: 'ADMIN_FORCE_PASSWORD_RESET',
        payload: { userId },
      },
    });

    this.recordAdminAction('FORCE_PASSWORD_RESET', 'Admin forced password reset on next login', {
      adminId,
      targetUserId: userId,
    });

    return { userId, passwordResetRequired: true };
  }

  async adminResetPassword(userId: string, newPassword: string, adminId?: string) {
    await this.ensureUserExists(userId);

    const pWord = newPassword;
    const saltRounds = this.config.get<number>('authService.security.bcryptSaltRounds') || 12;
    const passwordHash = await bcrypt.hash(pWord, saltRounds);

    await this.prismaWrite.$transaction(async (tx: any) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      await tx.session.updateMany({
        where: { userId },
        data: { expiresAt: new Date() },
      });

      await tx.authConfig.upsert({
        where: { userId },
        create: { userId },
        update: { failedLoginAttempts: 0 },
      });
      await setMustChangePassword(tx, userId, false);

      await tx.outbox.create({
        data: {
          type: 'ADMIN_USER_PASSWORD_RESET',
          payload: { userId },
        },
      });
    });

    this.recordAdminAction('PASSWORD_RESET', 'Admin manually reset user password', {
      adminId,
      targetUserId: userId,
    });

    return {
      passwordReset: true,
      message:
        'Password updated and all sessions ended. Share the new password with the user through your secure channel.',
    };
  }

  async getUserSessions(userId: string) {
    const sessions = await this.prismaRead.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    return { data: sessions.map(toAdminSessionItem) };
  }

  async terminateUserSession(sessionId: string) {
    await this.prismaWrite.session.update({
      where: { id: sessionId },
      data: { expiresAt: new Date() },
    });

    return { terminated: true };
  }

  async terminateAllUserSessions(userId: string) {
    const result = await this.revokeAllSessions(userId);
    return { terminated: result.count };
  }

  async getUserActivity(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prismaRead.auditLog.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          category: true,
          description: true,
          resourceType: true,
          resourceId: true,
          ip: true,
          userAgent: true,
          createdAt: true,
        },
      }),
      this.prismaRead.auditLog.count({ where: { userId } }),
    ]);

    if (total > 0) {
      return {
        data,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    }

    // Until auth/services publish audit rows, surface recent sessions as sign-in activity.
    const [sessions, sessionTotal] = await Promise.all([
      this.prismaRead.session.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          ip: true,
          userAgent: true,
          createdAt: true,
        },
      }),
      this.prismaRead.session.count({ where: { userId } }),
    ]);

    const sessionActivity = sessions.map((session) => ({
      id: `session-${session.id}`,
      action: 'LOGIN',
      category: 'auth',
      description: session.userAgent
        ? `Signed in from ${session.userAgent}`
        : 'Signed in (session started)',
      resourceType: 'Session',
      resourceId: session.id,
      ip: session.ip,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
    }));

    return {
      data: sessionActivity,
      pagination: {
        page,
        limit,
        total: sessionTotal,
        totalPages: Math.ceil(sessionTotal / limit) || 0,
      },
    };
  }

  async deleteUser(userId: string) {
    await this.assertSoleAdminSafe(userId, 'delete');

    await this.prismaWrite.user.update({
      where: { id: userId },
      data: { status: UserStatus.DELETED as any },
    });

    await this.revokeAllSessions(userId);

    await this.prismaWrite.outbox.create({
      data: {
        type: 'ADMIN_USER_DELETED',
        payload: { userId },
      },
    });

    return { deleted: true };
  }

  async restoreUser(userId: string) {
    await this.prismaWrite.user.update({
      where: { id: userId },
      data: { status: UserStatus.ACTIVE as any },
    });

    await this.prismaWrite.outbox.create({
      data: {
        type: 'ADMIN_USER_RESTORED',
        payload: { userId },
      },
    });

    return { restored: true };
  }

  async bulkOperation(dto: AdminBulkOperationDto) {
    const results = { success: 0, failed: 0, errors: [] as { userId: string; error: string }[] };

    for (const userId of dto.userIds) {
      try {
        switch (dto.action) {
          case 'suspend':
            await this.changeUserStatus(userId, UserStatus.SUSPENDED);
            break;
          case 'activate':
            await this.changeUserStatus(userId, UserStatus.ACTIVE);
            break;
          case 'delete':
            await this.deleteUser(userId);
            break;
          case 'resetPassword':
            throw new BusinessLogicException(
              'Bulk password reset requires a password per user; use Set password on user detail',
              'ADMIN_BULK_001',
            );
          default:
            throw new Error(`Unknown action: ${dto.action}`);
        }
        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push({ userId, error: err.message });
      }
    }

    return results;
  }

  async getLogs(page: number, limit: number, category: string) {
    const skip = (page - 1) * limit;
    const where = { category };

    const [data, total] = await Promise.all([
      this.prismaRead.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          action: true,
          category: true,
          description: true,
          resourceType: true,
          resourceId: true,
          ip: true,
          userAgent: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prismaRead.auditLog.count({ where }),
    ]);

    const enriched = data.map((row) => {
      const u = row.user;
      const displayName = u
        ? [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email
        : null;
      return {
        id: row.id,
        userId: row.userId,
        actor: displayName ?? row.userId,
        actorEmail: u?.email ?? null,
        action: row.action,
        category: row.category,
        description: row.description,
        resourceType: row.resourceType,
        resourceId: row.resourceId,
        ip: row.ip,
        userAgent: row.userAgent,
        createdAt: row.createdAt,
      };
    });

    return {
      data: enriched,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getSecurityStats() {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sessionWindowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // One connection and the same numbers the directory tiles show.
    const [row] = await this.prismaRead.$queryRaw<
      Array<{
        totalUsers: number;
        activeUsers: number;
        suspendedUsers: number;
        twoFactorEnabled: number;
        failedLogins24h: number;
        activeDeviceSessions: number;
        activeSessionUsers: number;
      }>
    >`
      SELECT
        (SELECT COUNT(*)::int FROM "User") AS "totalUsers",
        (SELECT COUNT(*)::int FROM "User" WHERE status = 'ACTIVE'::"UserStatus") AS "activeUsers",
        (SELECT COUNT(*)::int FROM "User" WHERE status = 'SUSPENDED'::"UserStatus") AS "suspendedUsers",
        (SELECT COUNT(*)::int FROM "AuthConfig" WHERE "twoFactorEnabled" = true) AS "twoFactorEnabled",
        (SELECT COUNT(*)::int FROM "AuditLog" WHERE action = 'LOGIN_FAILED' AND "createdAt" >= ${twentyFourHoursAgo}) AS "failedLogins24h",
        (SELECT COUNT(*)::int FROM "Session" WHERE "expiresAt" > ${now} AND "lastActiveAt" > ${sessionWindowStart}) AS "activeDeviceSessions",
        (SELECT COUNT(DISTINCT "userId")::int FROM "Session" WHERE "expiresAt" > ${now} AND "lastActiveAt" > ${sessionWindowStart}) AS "activeSessionUsers"
    `;

    const totalUsers = Number(row?.totalUsers ?? 0);
    const activeUsers = Number(row?.activeUsers ?? 0);
    const suspendedUsers = Number(row?.suspendedUsers ?? 0);
    const twoFactorEnabled = Number(row?.twoFactorEnabled ?? 0);
    const failedLogins24h = Number(row?.failedLogins24h ?? 0);
    const activeSessions = Number(row?.activeDeviceSessions ?? 0);
    const activeSessionUsers = Number(row?.activeSessionUsers ?? 0);

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      twoFactorEnabled,
      failedLogins24h,
      // Surface distinct users as the primary KPI (NL-AUTH-003); keep device count separate.
      activeSessions: activeSessionUsers,
      activeDeviceSessions: activeSessions,
      activeSessionUsers,
    };
  }

  private recordAdminAction(
    action: string,
    description: string,
    opts: {
      adminId?: string;
      targetUserId?: string;
      resourceType?: string;
      resourceId?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    publishAuditEntrySafe(
      this.queuePublisher,
      {
        action,
        category: 'admin',
        description,
        userId: opts.adminId,
        resourceType: opts.resourceType ?? 'User',
        resourceId: opts.resourceId ?? opts.targetUserId,
        metadata: {
          ...opts.metadata,
          ...(opts.targetUserId ? { targetUserId: opts.targetUserId } : {}),
        },
      },
      this.logger,
    );
  }

  private async mapToAdminDetail(user: {
    id: string;
    authConfig?: { twoFactorEnabled?: boolean } | null;
    [key: string]: unknown;
  }) {
    const mustChangePassword = await readMustChangePassword(this.prismaRead, user.id);
    return toAdminUserDetail({
      ...user,
      authConfig: { ...user.authConfig, mustChangePassword },
    } as Parameters<typeof toAdminUserDetail>[0]);
  }

  private async ensureUserExists(userId: string) {
    const user = await this.prismaRead.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BusinessLogicException('User not found', 'USER_001');
    }
    return user;
  }

  private async revokeAllSessions(userId: string) {
    return this.prismaWrite.session.updateMany({
      where: { userId },
      data: { expiresAt: new Date() },
    });
  }

  /** Platform allows exactly one ADMIN account. */
  private async assertSoleAdminSafe(userId: string, action: 'demote' | 'suspend' | 'delete') {
    const user = await this.prismaRead.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== UserRole.ADMIN) return;

    const adminCount = await this.prismaRead.user.count({
      where: { role: UserRole.ADMIN, status: { not: UserStatus.DELETED as any } },
    });

    if (adminCount <= 1) {
      const messages = {
        demote: 'Cannot change role of the only platform administrator',
        suspend: 'Cannot suspend the only platform administrator',
        delete: 'Cannot delete the only platform administrator',
      };
      throw new BusinessLogicException(messages[action], 'ADMIN_SOLE_001');
    }
  }

  private async assertSingleAdminRole(userId: string, role: UserRole) {
    if (role !== UserRole.ADMIN) {
      await this.assertSoleAdminSafe(userId, 'demote');
      return;
    }

    const otherAdmins = await this.prismaRead.user.count({
      where: {
        role: UserRole.ADMIN,
        id: { not: userId },
        status: { not: UserStatus.DELETED as any },
      },
    });

    if (otherAdmins > 0) {
      throw new BusinessLogicException(
        'Only one administrator account is allowed on the platform',
        'ADMIN_SOLE_002',
      );
    }
  }
}
