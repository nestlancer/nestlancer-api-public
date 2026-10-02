import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { NotificationJob } from '@nestlancer/common';
import { PrismaReadService } from '@nestlancer/database';
import {
  isNotificationTypeAllowed,
  NotificationPreferenceRecord,
  parseEnabledNotificationTypes,
  shouldDeliverNotification,
} from '@nestlancer/notifications';

function toPreferenceRecord(
  preference: {
    preferences: unknown;
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
    quietHoursTimezone: string;
  } | null,
): NotificationPreferenceRecord | undefined {
  if (!preference) return undefined;
  const prefs = preference.preferences;
  return {
    preferences:
      prefs && typeof prefs === 'object' && !Array.isArray(prefs)
        ? (prefs as Record<string, unknown>)
        : null,
    quietHoursStart: preference.quietHoursStart,
    quietHoursEnd: preference.quietHoursEnd,
    quietHoursTimezone: preference.quietHoursTimezone,
  };
}

@Injectable()
export class NotificationPreferenceGateService {
  private readonly logger = new Logger(NotificationPreferenceGateService.name);
  private readonly enabledTypes: Set<string> | null;
  private readonly gatingEnabled: boolean;

  constructor(
    private readonly prisma: PrismaReadService,
    private readonly configService: ConfigService,
  ) {
    this.enabledTypes = parseEnabledNotificationTypes(
      this.configService.get<string>('notificationWorker.enabledTypes'),
    );
    this.gatingEnabled =
      this.configService.get<boolean>('notificationWorker.preferenceGatingEnabled') !== false;
  }

  async shouldDeliver(job: NotificationJob): Promise<{ allowed: boolean; reason?: string }> {
    const notificationType =
      job.notificationType ||
      (typeof job.notification.data?.type === 'string' ? job.notification.data.type : undefined) ||
      job.type;

    if (!isNotificationTypeAllowed(notificationType, this.enabledTypes)) {
      return { allowed: false, reason: 'type_disabled' };
    }

    if (!this.gatingEnabled) return { allowed: true };

    try {
      const preference = await this.prisma.notificationPreference.findUnique({
        where: { userId: job.userId },
      });

      const allowed = shouldDeliverNotification({
        notificationType,
        priority: job.priority,
        preference: toPreferenceRecord(preference),
      });

      if (!allowed) {
        return { allowed: false, reason: 'user_preference' };
      }
    } catch (error: unknown) {
      this.logger.warn(
        `Preference lookup failed for user=${job.userId}: ${(error as Error).message}`,
      );
    }

    return { allowed: true };
  }
}
