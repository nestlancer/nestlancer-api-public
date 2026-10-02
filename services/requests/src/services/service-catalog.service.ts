import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';
import { toPaise } from '@nestlancer/common';
import { UpsertServicePackageDto } from '../dto/upsert-service-package.dto';

@Injectable()
export class ServiceCatalogService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
  ) {}

  async listActive() {
    return this.prismaRead.servicePackage.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async listAll() {
    return this.prismaRead.servicePackage.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async getBySlug(slug: string) {
    return this.prismaRead.servicePackage.findFirst({
      where: { slug, isActive: true },
    });
  }

  async upsert(dto: UpsertServicePackageDto) {
    const basePricePaise = this.resolveBasePricePaise(dto);

    const data = {
      name: dto.name,
      description: dto.description,
      category: dto.category,
      basePricePaise,
      estimatedDays: dto.estimatedDays ?? 7,
      revisionsIncluded: dto.revisionsIncluded ?? 2,
      deliverables: (dto.deliverables ?? undefined) as Prisma.InputJsonValue | undefined,
      addOns: (dto.addOns ?? undefined) as Prisma.InputJsonValue | undefined,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    };

    return this.prismaWrite.servicePackage.upsert({
      where: { slug: dto.slug },
      create: {
        ...(dto.id ? { id: dto.id } : {}),
        slug: dto.slug,
        ...data,
      },
      update: data,
    });
  }

  async update(id: string, dto: Partial<UpsertServicePackageDto>) {
    const existing = await this.prismaRead.servicePackage.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Service package ${id} not found`);
    }

    const basePricePaise =
      dto.basePricePaise !== undefined || dto.basePrice !== undefined
        ? this.resolveBasePricePaise(dto as UpsertServicePackageDto)
        : undefined;

    return this.prismaWrite.servicePackage.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(basePricePaise !== undefined ? { basePricePaise } : {}),
        ...(dto.estimatedDays !== undefined ? { estimatedDays: dto.estimatedDays } : {}),
        ...(dto.revisionsIncluded !== undefined
          ? { revisionsIncluded: dto.revisionsIncluded }
          : {}),
        ...(dto.deliverables !== undefined
          ? { deliverables: dto.deliverables as Prisma.InputJsonValue }
          : {}),
        ...(dto.addOns !== undefined ? { addOns: dto.addOns as Prisma.InputJsonValue } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }

  private resolveBasePricePaise(dto: UpsertServicePackageDto): number {
    if (dto.basePricePaise !== undefined && dto.basePricePaise !== null) {
      return Math.trunc(dto.basePricePaise);
    }
    if (dto.basePrice !== undefined && dto.basePrice !== null) {
      return toPaise(dto.basePrice);
    }
    throw new BadRequestException('Provide basePricePaise or basePrice');
  }
}
