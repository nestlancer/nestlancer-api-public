import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { CacheService } from '@nestlancer/cache';
import { SystemConfig } from '../entities/system-config.entity';
import { UpdateSystemConfigDto } from '../dto/update-system-config.dto';

@Injectable()
export class SystemConfigService {
  private readonly CACHE_PREFIX = 'system_config:';

  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly cacheService: CacheService,
  ) {}

  async get(key: string): Promise<any> {
    const cached = await this.cacheService.get(`${this.CACHE_PREFIX}${key}`);
    if (cached) {
      return cached;
    }

    const config = await this.prismaRead.systemConfig.findUnique({ where: { key } });
    if (!config) {
      throw new NotFoundException(`Config key ${key} not found`);
    }

    await this.cacheService.set(`${this.CACHE_PREFIX}${key}`, config.value, 86400); // 24h
    return config.value;
  }

  async set(dto: UpdateSystemConfigDto, updatedBy?: string): Promise<SystemConfig> {
    const config = await this.prismaWrite.systemConfig.upsert({
      where: { key: dto.key },
      create: {
        key: dto.key,
        value: dto.value as Prisma.InputJsonValue,
        description: dto.description,
        updatedBy: updatedBy || undefined,
      },
      update: {
        value: dto.value as Prisma.InputJsonValue,
        ...(updatedBy ? { updatedBy } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
    });

    await this.cacheService.del(`${this.CACHE_PREFIX}${dto.key}`);
    // Issue pub/sub event via cache service if needed for cross-instance sync

    return config as unknown as SystemConfig;
  }

  async getAll(): Promise<Record<string, any>> {
    const configs = await this.prismaRead.systemConfig.findMany();
    const result: Record<string, any> = {};
    for (const config of configs) {
      result[config.key] = config.value;
    }
    return result;
  }
}
