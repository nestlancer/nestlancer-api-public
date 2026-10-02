import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaWriteService, PrismaReadService, ReadOnly } from '@nestlancer/database';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

@Injectable()
export class PortfolioCategoriesService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  @ReadOnly()
  async findAll() {
    return this.prismaRead.portfolioCategory.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });
  }

  @ReadOnly()
  async findOne(id: string) {
    const category = await this.prismaRead.portfolioCategory.findUnique({
      where: { id },
      include: {
        _count: { select: { items: true } },
      },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(dto: CreateCategoryDto) {
    const slug =
      dto.slug ||
      dto.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

    return this.prismaWrite.portfolioCategory.upsert({
      where: { slug },
      create: {
        name: dto.name,
        slug,
        description: dto.description,
        order: dto.order ?? 0,
      },
      update: {
        name: dto.name,
        description: dto.description,
        order: dto.order ?? 0,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    if (dto.name || dto.slug) {
      const slug =
        dto.slug ||
        (dto.name
          ? dto.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)+/g, '')
          : undefined);
      const existing = await this.prismaRead.portfolioCategory.findFirst({
        where: {
          OR: [{ name: dto.name }, { slug: slug }],
          NOT: { id },
        },
      });
      if (existing) throw new ConflictException('Category with this name or slug already exists');
      if (slug) dto.slug = slug;
    }

    return this.prismaWrite.portfolioCategory.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, reassignToId?: string) {
    const category = await this.findOne(id);

    if (category._count.items > 0) {
      if (!reassignToId) {
        throw new BadRequestException(
          'Cannot delete category with items unless reassignToId is provided',
        );
      }

      await this.prismaWrite.portfolioItem.updateMany({
        where: { categoryId: id },
        data: { categoryId: reassignToId },
      });
    }

    return this.prismaWrite.portfolioCategory.delete({
      where: { id },
    });
  }
}
