import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { CacheService } from '@nestlancer/cache';
import { QueuePublisherService } from '@nestlancer/queue';

@Injectable()
export class FeatureFlagsService {
  private readonly CACHE_PREFIX = 'feature_flag:';

  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly cacheService: CacheService,
    private readonly queueService: QueuePublisherService,
  ) {}

  async findAll() {
    const flags = await this.prismaRead.featureFlag.findMany();
    // Virus scanning is controlled by MEDIA_SKIP_VIRUS_SCAN on the media worker,
    // not this DB flag — surface the live posture so Features UI does not lie.
    const virusScanningLive = process.env.MEDIA_SKIP_VIRUS_SCAN !== 'true';
    return flags.map((feature) =>
      feature.flag === 'VIRUS_SCANNING'
        ? {
            ...feature,
            enabled: virusScanningLive,
            description:
              feature.description ||
              'Enable virus scanning for uploaded files (mirrors MEDIA_SKIP_VIRUS_SCAN)',
          }
        : feature,
    );
  }

  async findOne(flag: string) {
    const feature = await this.prismaRead.featureFlag.findUnique({ where: { flag } });
    if (!feature) throw new NotFoundException(`Feature flag ${flag} not found`);
    return feature;
  }

  async toggleFeature(
    flag: string,
    enabled: boolean,
    extras?: { description?: string; rolloutPercentage?: number },
  ) {
    const feature = await this.prismaWrite.featureFlag.upsert({
      where: { flag },
      create: {
        flag,
        enabled,
        description: extras?.description ?? '',
        rolloutPercentage: extras?.rolloutPercentage ?? 0,
      },
      update: {
        enabled,
        ...(extras?.description !== undefined ? { description: extras.description } : {}),
        ...(extras?.rolloutPercentage !== undefined
          ? { rolloutPercentage: extras.rolloutPercentage }
          : {}),
      },
    });

    await this.cacheService.del(`${this.CACHE_PREFIX}${flag}`);

    await this.queueService.publish('events', 'FEATURE_FLAG_UPDATED', {
      flag,
      enabled,
      timestamp: new Date().toISOString(),
    });

    return feature;
  }
}
