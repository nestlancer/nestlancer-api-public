import { Injectable } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { BusinessLogicException, toPaise, toRupees } from '@nestlancer/common';
import { CreateLineItemBlockDto, UpdateLineItemBlockDto } from '../dto/line-item-library.dto';

@Injectable()
export class QuoteLineItemLibraryService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  async list(activeOnly = true) {
    const blocks = await this.prismaRead.quoteLineItemBlock.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });

    return blocks.map(
      (block: {
        id: string;
        slug: string;
        label: string;
        description: string;
        category: string;
        defaultUnitPricePaise: number;
        defaultQuantity: number;
        isActive: boolean;
        sortOrder: number;
        createdAt: Date;
        updatedAt: Date;
      }) => this.formatBlock(block),
    );
  }

  async create(dto: CreateLineItemBlockDto) {
    const block = await this.prismaWrite.quoteLineItemBlock.upsert({
      where: { slug: dto.slug },
      create: {
        slug: dto.slug,
        label: dto.label,
        description: dto.description,
        category: dto.category,
        defaultUnitPricePaise: toPaise(dto.defaultUnitPrice),
        defaultQuantity: dto.defaultQuantity ?? 1,
        sortOrder: dto.sortOrder ?? 0,
      },
      update: {
        label: dto.label,
        description: dto.description,
        category: dto.category,
        defaultUnitPricePaise: toPaise(dto.defaultUnitPrice),
        defaultQuantity: dto.defaultQuantity ?? 1,
        sortOrder: dto.sortOrder ?? 0,
        isActive: true,
      },
    });

    return this.formatBlock(block);
  }

  async update(id: string, dto: UpdateLineItemBlockDto) {
    const existing = await this.prismaRead.quoteLineItemBlock.findUnique({ where: { id } });
    if (!existing) {
      throw new BusinessLogicException('Line-item block not found', 'QUOTE_014');
    }

    const block = await this.prismaWrite.quoteLineItemBlock.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.defaultUnitPrice !== undefined
          ? { defaultUnitPricePaise: toPaise(dto.defaultUnitPrice) }
          : {}),
        ...(dto.defaultQuantity !== undefined ? { defaultQuantity: dto.defaultQuantity } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });

    return this.formatBlock(block);
  }

  async deactivate(id: string) {
    const existing = await this.prismaRead.quoteLineItemBlock.findUnique({ where: { id } });
    if (!existing) {
      throw new BusinessLogicException('Line-item block not found', 'QUOTE_014');
    }

    await this.prismaWrite.quoteLineItemBlock.update({
      where: { id },
      data: { isActive: false },
    });

    return { id, deactivated: true };
  }

  private formatBlock(block: {
    id: string;
    slug: string;
    label: string;
    description: string;
    category: string;
    defaultUnitPricePaise: number;
    defaultQuantity: number;
    isActive: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: block.id,
      slug: block.slug,
      label: block.label,
      description: block.description,
      category: block.category,
      defaultUnitPrice: toRupees(block.defaultUnitPricePaise),
      defaultUnitPricePaise: block.defaultUnitPricePaise,
      defaultQuantity: block.defaultQuantity,
      isActive: block.isActive,
      sortOrder: block.sortOrder,
      createdAt: block.createdAt,
      updatedAt: block.updatedAt,
    };
  }
}
