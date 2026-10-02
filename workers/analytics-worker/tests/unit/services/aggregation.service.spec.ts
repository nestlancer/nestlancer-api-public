import { Test, TestingModule } from '@nestjs/testing';
import { AggregationService } from '../../../src/services/aggregation.service';
import { PrismaReadService } from '@nestlancer/database';

describe('AggregationService', () => {
  let service: AggregationService;
  let prismaRead: jest.Mocked<PrismaReadService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AggregationService,
        {
          provide: PrismaReadService,
          useValue: {
            user: { groupBy: jest.fn(), count: jest.fn() },
            $queryRawUnsafe: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AggregationService>(AggregationService);
    prismaRead = module.get(PrismaReadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('aggregate', () => {
    it('should aggregate data using Prisma groupBy', async () => {
      (prismaRead as any).user.groupBy.mockResolvedValue([{ role: 'admin', _count: { id: 1 } }]);

      const result = await service.aggregate('user', ['role'], { id: 'count' });

      expect((prismaRead as any).user.groupBy).toHaveBeenCalledWith({
        by: ['role'],
        where: {},
        _count: { id: true },
      });
      expect(result).toEqual([{ role: 'admin', _count: { id: 1 } }]);
    });

    it('should count without groupBy when no grouping fields are provided', async () => {
      (prismaRead as any).user.count.mockResolvedValue(42);

      const result = await service.aggregate('user', [], { id: 'count' });

      expect((prismaRead as any).user.count).toHaveBeenCalledWith({ where: {} });
      expect(result).toEqual([{ _count: { id: 42 } }]);
    });

    it('should throw Error if model not found in Prisma wrapper', async () => {
      await expect(service.aggregate('invalidModel', [], { id: 'count' })).rejects.toThrow(
        'Model invalidModel not found in PrismaReadService',
      );
    });
  });

  describe('rawQuery', () => {
    it('should execute raw query', async () => {
      prismaRead.$queryRawUnsafe.mockResolvedValue([{ id: 1 }] as any);
      const result = await service.rawQuery('SELECT * FROM users');
      expect(prismaRead.$queryRawUnsafe).toHaveBeenCalledWith('SELECT * FROM users');
      expect(result).toEqual([{ id: 1 }]);
    });
  });
});
