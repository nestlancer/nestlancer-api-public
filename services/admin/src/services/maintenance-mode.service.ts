import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { CacheService } from '@nestlancer/cache';
import { PrismaWriteService } from '@nestlancer/database';
import { SystemConfigService } from './system-config.service';
import { ToggleMaintenanceDto } from '../dto/toggle-maintenance.dto';
import { MAINTENANCE_CACHE_KEY } from './maintenance-cache';

@Injectable()
export class MaintenanceModeService {
  private readonly logger = new Logger(MaintenanceModeService.name);
  private readonly MAINTENANCE_KEY = 'MAINTENANCE_MODE';
  private readonly MAINTENANCE_ALIAS_KEY = 'system.maintenance';

  constructor(
    private readonly configService: SystemConfigService,
    private readonly cacheService: CacheService,
    private readonly prismaWrite: PrismaWriteService,
  ) {}

  async getStatus() {
    try {
      const cached = await this.cacheService.get<Record<string, unknown>>(MAINTENANCE_CACHE_KEY);
      if (cached && typeof cached === 'object') return cached;
    } catch {
      // fall through to DB
    }

    try {
      const config = await this.configService.get(this.MAINTENANCE_KEY);
      if (config && typeof config === 'object') {
        await this.cacheService.set(MAINTENANCE_CACHE_KEY, config).catch(() => undefined);
        return config;
      }
      return { enabled: Boolean(config) };
    } catch {
      return { enabled: false };
    }
  }

  async toggle(dto: ToggleMaintenanceDto, userId: string) {
    const currentStatus = await this.getStatus();
    const currentlyEnabled = Boolean(
      currentStatus && typeof currentStatus === 'object'
        ? (currentStatus as { enabled?: boolean }).enabled
        : currentStatus,
    );

    if (currentlyEnabled === dto.enabled) {
      return {
        ...(typeof currentStatus === 'object' && currentStatus ? currentStatus : {}),
        enabled: dto.enabled,
        unchanged: true,
      };
    }

    let estimatedEnd = dto.estimatedEnd;
    if (estimatedEnd) {
      const parsed = new Date(estimatedEnd);
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException('estimatedEnd must be a valid date/time');
      }
      estimatedEnd = parsed.toISOString();
    }

    const newConfig = {
      enabled: dto.enabled,
      message: dto.message || 'System is under maintenance. Please check back later.',
      estimatedEnd: estimatedEnd || null,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };

    await this.configService.set({ key: this.MAINTENANCE_KEY, value: newConfig }, userId);
    await this.configService.set(
      {
        key: this.MAINTENANCE_ALIAS_KEY,
        value: {
          enabled: newConfig.enabled,
          message: newConfig.message,
          estimatedEndTime: newConfig.estimatedEnd,
        },
      },
      userId,
    );

    await this.cacheService.set(MAINTENANCE_CACHE_KEY, newConfig);

    if (dto.enabled) {
      await this.revokeNonAdminSessions();
    }

    this.logger.log(`Maintenance mode ${dto.enabled ? 'ENABLED' : 'DISABLED'} by ${userId}`);

    return newConfig;
  }

  /** Drop client refresh sessions so browsers cannot silently restore after maintenance starts. */
  private async revokeNonAdminSessions(): Promise<void> {
    try {
      const result = await this.prismaWrite.session.deleteMany({
        where: {
          user: {
            role: { not: 'ADMIN' },
          },
        },
      });
      this.logger.log(`Revoked ${result.count} non-admin session(s) for maintenance mode`);
    } catch (err) {
      this.logger.warn(
        `Failed to revoke client sessions on maintenance enable: ${(err as Error).message}`,
      );
    }
  }
}
