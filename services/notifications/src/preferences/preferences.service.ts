import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { DEFAULT_TIMEZONE } from '@nestlancer/common';
import { PrismaWriteService, PrismaReadService, ReadOnly } from '@nestlancer/database';
import { UpdatePreferencesDto } from '../dto/update-preferences.dto';

@Injectable()
export class PreferencesService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  private async resolveAccountTimezone(userId: string): Promise<string> {
    const userPref = await this.prismaRead.userPreference.findUnique({
      where: { userId },
      select: { timezone: true },
    });
    const tz = userPref?.timezone?.trim();
    return tz || DEFAULT_TIMEZONE;
  }

  /**
   * When quiet hours are not configured, prefer the account timezone over a stale
   * UTC column default so the settings UI matches Asia/Kolkata account prefs.
   */
  private resolveDisplayedTimezone(
    pref: { quietHoursStart: string | null; quietHoursEnd: string | null; quietHoursTimezone: string },
    accountTimezone: string,
  ): string {
    const hasQuietHours =
      pref.quietHoursStart != null &&
      pref.quietHoursStart.length > 0 &&
      pref.quietHoursEnd != null &&
      pref.quietHoursEnd.length > 0;
    if (hasQuietHours) {
      return pref.quietHoursTimezone || accountTimezone;
    }
    if (pref.quietHoursTimezone && pref.quietHoursTimezone !== 'UTC') {
      return pref.quietHoursTimezone;
    }
    return accountTimezone;
  }

  @ReadOnly()
  async getPreferences(userId: string) {
    const accountTimezone = await this.resolveAccountTimezone(userId);
    let pref = await this.prismaRead.notificationPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      pref = await this.prismaWrite.notificationPreference.create({
        data: {
          userId,
          preferences: {},
          quietHoursStart: null,
          quietHoursEnd: null,
          quietHoursTimezone: accountTimezone,
        },
      });
    }

    return {
      userId: pref.userId,
      preferences: pref.preferences,
      quietHours: {
        start: pref.quietHoursStart,
        end: pref.quietHoursEnd,
        timezone: this.resolveDisplayedTimezone(pref, accountTimezone),
      },
      updatedAt: pref.updatedAt,
    };
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const accountTimezone = await this.resolveAccountTimezone(userId);
    const dataToUpdate: Record<string, unknown> = {};
    const channelMap = dto.preferences ?? dto.channels;

    if (channelMap) {
      dataToUpdate.preferences = channelMap as unknown as Prisma.InputJsonValue;
    }

    if (dto.quietHours) {
      // GET returns null start/end when unset — treat that as "clear quiet hours".
      const clear = dto.quietHours.start == null && dto.quietHours.end == null;
      dataToUpdate.quietHoursStart = clear ? null : dto.quietHours.start;
      dataToUpdate.quietHoursEnd = clear ? null : dto.quietHours.end;
      dataToUpdate.quietHoursTimezone = dto.quietHours.timezone || accountTimezone;
    }

    const updated = await this.prismaWrite.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        preferences: (channelMap || {}) as unknown as Prisma.InputJsonValue,
        quietHoursStart: dto.quietHours?.start || null,
        quietHoursEnd: dto.quietHours?.end || null,
        quietHoursTimezone: dto.quietHours?.timezone || accountTimezone,
      },
      update: dataToUpdate,
    });

    return {
      preferences: updated.preferences,
      channels: updated.preferences,
      quietHours: {
        start: updated.quietHoursStart,
        end: updated.quietHoursEnd,
        timezone: this.resolveDisplayedTimezone(updated, accountTimezone),
      },
      updatedAt: updated.updatedAt,
    };
  }

  @ReadOnly()
  async getChannels() {
    return [
      { id: 'inApp', name: 'In-App Notifications', status: 'available' },
      { id: 'email', name: 'Email Notifications', status: 'available' },
      { id: 'push', name: 'Push Notifications', status: 'requires_subscription' },
    ];
  }
}
