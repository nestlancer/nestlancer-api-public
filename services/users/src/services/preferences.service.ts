import { Injectable } from '@nestjs/common';
import { PrismaWriteService } from '@nestlancer/database';
import { UpdatePreferencesDto } from '../dto/update-preferences.dto';

@Injectable()
export class PreferencesService {
  constructor(private readonly prisma: PrismaWriteService) {}

  async getPreferences(userId: string) {
    const prefs = await this.prisma.userPreference.findUnique({
      where: { userId },
    });

    return {
      notifications: prefs?.notificationSettings || {},
      privacy: prefs?.privacySettings || {},
    };
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const updated = await this.prisma.userPreference.upsert({
      where: { userId },
      update: {
        notificationSettings: dto.notifications as any,
        privacySettings: dto.privacy as any,
      },
      create: {
        userId,
        notificationSettings: dto.notifications as any,
        privacySettings: dto.privacy as any,
      },
    });

    return {
      notifications: updated.notificationSettings,
      privacy: updated.privacySettings,
      updatedAt: updated.updatedAt,
    };
  }
}
