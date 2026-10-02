import { Injectable } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService, setMustChangePassword } from '@nestlancer/database';
import { BusinessLogicException, ProjectStatus, PaymentStatus } from '@nestlancer/common';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { AvatarService } from './avatar.service';
import * as bcrypt from 'bcrypt';

interface PublicProfileFields {
  headline?: string | null;
  bio?: string | null;
  skills: string[];
}

function parsePublicProfileFields(brandGuidelines: unknown): PublicProfileFields {
  if (!brandGuidelines || typeof brandGuidelines !== 'object' || Array.isArray(brandGuidelines)) {
    return { skills: [] };
  }
  const record = brandGuidelines as Record<string, unknown>;
  const skills = Array.isArray(record.skills)
    ? record.skills.filter((skill): skill is string => typeof skill === 'string')
    : [];
  return {
    headline: typeof record.headline === 'string' ? record.headline : null,
    bio: typeof record.bio === 'string' ? record.bio : null,
    skills,
  };
}

function mergePublicProfileFields(
  existing: unknown,
  updates: Pick<UpdateProfileDto, 'headline' | 'bio' | 'skills'>,
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};

  if (updates.headline !== undefined) {
    base.headline = updates.headline?.trim() ? updates.headline.trim() : null;
  }
  if (updates.bio !== undefined) {
    base.bio = updates.bio?.trim() ? updates.bio.trim() : null;
  }
  if (updates.skills !== undefined) {
    base.skills = updates.skills.map((skill) => skill.trim()).filter(Boolean);
  }

  return base;
}

interface UserStats {
  projectsCompleted: number;
  totalSpent: number;
  projectsInProgress: number;
  totalProjects: number;
}

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  headline?: string | null;
  bio?: string | null;
  skills: string[];
  role: string;
  avatar?: string;
  avatarUrl?: string;
  avatarSignedUrl?: string;
  twoFactorEnabled: boolean;
  timezone?: string;
  language?: string;
  preferences: {
    notifications: Record<string, unknown>;
    privacy: Record<string, unknown>;
  };
  stats: UserStats;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

@Injectable()
export class ProfileService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly avatarService: AvatarService,
  ) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const [user, stats] = await Promise.all([
      this.prismaRead.user.findUnique({
        where: { id: userId },
        include: {
          preferences: true,
          authConfig: { select: { twoFactorEnabled: true } },
        },
      }),
      this.getUserStats(userId),
    ]);

    if (!user) {
      throw new BusinessLogicException('User not found', 'USER_001');
    }

    return this.formatProfileResponse(user, stats);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfile> {
    const shouldUpdatePublicProfile =
      dto.headline !== undefined || dto.bio !== undefined || dto.skills !== undefined;

    const existingUser = shouldUpdatePublicProfile
      ? await this.prismaRead.user.findUnique({
          where: { id: userId },
          select: { brandGuidelines: true },
        })
      : null;

    const data: Record<string, unknown> = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.phone !== undefined) data.phone = dto.phone?.trim() ? dto.phone.trim() : null;
    if (shouldUpdatePublicProfile) {
      data.brandGuidelines = mergePublicProfileFields(existingUser?.brandGuidelines, dto);
    }

    const user = await this.prismaWrite.user.update({
      where: { id: userId },
      data: {
        ...data,
        preferences:
          dto.timezone || dto.language
            ? {
                upsert: {
                  create: {
                    timezone: dto.timezone || 'UTC',
                    language: dto.language || 'en',
                  },
                  update: {
                    ...(dto.timezone && { timezone: dto.timezone }),
                    ...(dto.language && { language: dto.language }),
                  },
                },
              }
            : undefined,
      },
      include: {
        preferences: true,
        authConfig: { select: { twoFactorEnabled: true } },
      },
    });

    await this.prismaWrite.outbox.create({
      data: {
        type: 'USER_PROFILE_UPDATED',
        aggregateType: 'User',
        aggregateId: user.id,
        payload: { userId: user.id, updatedFields: Object.keys(dto) },
      },
    });

    const stats = await this.getUserStats(userId);
    return this.formatProfileResponse(user, stats);
  }

  private async getUserStats(userId: string): Promise<UserStats> {
    const [projectStats, paymentStats] = await Promise.all([
      this.prismaRead.project.groupBy({
        by: ['status'],
        where: { clientId: userId, deletedAt: null },
        _count: { id: true },
      }),
      this.prismaRead.payment.aggregate({
        where: {
          clientId: userId,
          status: PaymentStatus.COMPLETED,
        },
        _sum: { amount: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const item of projectStats) {
      const row = item as { status: string; _count: { id: number } };
      statusCounts[row.status] = row._count.id;
    }

    let totalProjects = 0;
    for (const count of Object.values(statusCounts)) {
      totalProjects += count;
    }
    const projectsCompleted = statusCounts[ProjectStatus.COMPLETED] || 0;
    const projectsInProgress = statusCounts[ProjectStatus.IN_PROGRESS] || 0;

    return {
      projectsCompleted,
      totalSpent: Number(paymentStats._sum?.amount ?? 0),
      projectsInProgress,
      totalProjects,
    };
  }

  private async formatProfileResponse(user: any, stats: UserStats): Promise<UserProfile> {
    const avatarFields = await this.avatarService.resolveAvatarDisplay(user.avatar);
    const publicProfile = parsePublicProfileFields(user.brandGuidelines);
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? null,
      headline: publicProfile.headline ?? null,
      bio: publicProfile.bio ?? null,
      skills: publicProfile.skills,
      role: user.role,
      ...avatarFields,
      twoFactorEnabled: user.authConfig?.twoFactorEnabled ?? false,
      timezone: user.preferences?.timezone,
      language: user.preferences?.language,
      preferences: {
        notifications: user.preferences?.notificationSettings || {},
        privacy: user.preferences?.privacySettings || {},
      },
      stats,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BusinessLogicException('Passwords do not match', 'USER_010');
    }

    const user = await this.prismaRead.user.findUnique({ where: { id: userId } });
    if (!user) throw new BusinessLogicException('User not found', 'USER_001');

    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) throw new BusinessLogicException('Current password is incorrect', 'USER_011');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prismaWrite.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await this.prismaWrite.authConfig.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    await setMustChangePassword(this.prismaWrite, userId, false);

    return { passwordChanged: true };
  }
}
