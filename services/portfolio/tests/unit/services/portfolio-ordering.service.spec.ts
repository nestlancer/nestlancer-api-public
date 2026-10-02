import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioOrderingService } from '../../../src/services/portfolio-ordering.service';
import { PrismaWriteService } from '@nestlancer/database';
import { ReorderPortfolioDto } from '../../../src/dto/reorder-portfolio.dto';

describe('PortfolioOrderingService', () => {
  let service: PortfolioOrderingService;
  let prismaWrite: jest.Mocked<PrismaWriteService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioOrderingService,
        {
          provide: PrismaWriteService,
          useValue: {
            portfolioItem: { update: jest.fn() },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PortfolioOrderingService>(PortfolioOrderingService);
    prismaWrite = module.get(PrismaWriteService);

    prismaWrite.$transaction.mockImplementation(async (cb: any) => {
      if (Array.isArray(cb)) {
        return Promise.all(cb);
      }
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('reorder', () => {
    it('should execute transaction with updates', async () => {
      const dto: ReorderPortfolioDto = {
        items: [
          { id: '1', order: 5 },
          { id: '2', order: 6 },
        ],
      };

      await service.reorder(dto);

      expect(prismaWrite.$transaction).toHaveBeenCalled();
      expect(prismaWrite.portfolioItem.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { order: 5 },
      });
      expect(prismaWrite.portfolioItem.update).toHaveBeenCalledWith({
        where: { id: '2' },
        data: { order: 6 },
      });
    });
  });
});
