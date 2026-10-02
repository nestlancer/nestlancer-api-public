import { Test, TestingModule } from '@nestjs/testing';
import { QuoteLineItemLibraryService } from '../../../src/services/quote-line-item-library.service';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';

describe('QuoteLineItemLibraryService', () => {
  let service: QuoteLineItemLibraryService;
  let prismaWrite: jest.Mocked<PrismaWriteService>;
  let prismaRead: jest.Mocked<PrismaReadService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuoteLineItemLibraryService,
        {
          provide: PrismaWriteService,
          useValue: {
            quoteLineItemBlock: { create: jest.fn(), upsert: jest.fn(), update: jest.fn() },
          },
        },
        {
          provide: PrismaReadService,
          useValue: {
            quoteLineItemBlock: { findMany: jest.fn(), findUnique: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get(QuoteLineItemLibraryService);
    prismaWrite = module.get(PrismaWriteService);
    prismaRead = module.get(PrismaReadService);
  });

  it('lists active blocks', async () => {
    prismaRead.quoteLineItemBlock.findMany.mockResolvedValue([
      {
        id: '1',
        slug: 'discovery',
        label: 'Discovery',
        description: 'Workshop',
        category: 'discovery',
        defaultUnitPricePaise: 1500000,
        defaultQuantity: 1,
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);

    const blocks = await service.list(true);
    expect(blocks[0].defaultUnitPrice).toBe(15000);
  });

  it('upserts blocks by slug on create', async () => {
    prismaWrite.quoteLineItemBlock.upsert.mockResolvedValue({
      id: '1',
      slug: 'discovery',
      label: 'Discovery',
      description: 'Workshop',
      category: 'discovery',
      defaultUnitPricePaise: 1500000,
      defaultQuantity: 1,
      isActive: true,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await service.create({
      slug: 'discovery',
      label: 'Discovery',
      description: 'Workshop',
      category: 'discovery',
      defaultUnitPrice: 15000,
    });

    expect(prismaWrite.quoteLineItemBlock.upsert).toHaveBeenCalledWith({
      where: { slug: 'discovery' },
      create: expect.objectContaining({ slug: 'discovery', label: 'Discovery' }),
      update: expect.objectContaining({ label: 'Discovery', isActive: true }),
    });
    expect(result.defaultUnitPrice).toBe(15000);
  });
});
