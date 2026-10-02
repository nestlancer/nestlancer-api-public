import { Test, TestingModule } from '@nestjs/testing';
import { QuotesAdminController } from '../../../src/controllers/quotes.admin.controller';
import { QuotesAdminService } from '../../../src/services/quotes.admin.service';
import { QuoteStatsService } from '../../../src/services/quote-stats.service';
import { HttpStatus } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';
import { QuotePdfService } from '../../../src/services/quote-pdf.service';
import { ContractPdfService } from '../../../src/services/contract-pdf.service';
import { QuoteLineItemLibraryService } from '../../../src/services/quote-line-item-library.service';
import { DocumentGenerationService } from '@nestlancer/documents';

describe('QuotesAdminController', () => {
  let controller: QuotesAdminController;
  let adminService: jest.Mocked<QuotesAdminService>;
  let statsService: jest.Mocked<QuoteStatsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuotesAdminController],
      providers: [
        {
          provide: QuotesAdminService,
          useValue: {
            listQuotes: jest.fn(),
            createQuote: jest.fn(),
            sendQuote: jest.fn(),
            resendQuote: jest.fn(),
          },
        },
        {
          provide: QuoteStatsService,
          useValue: {
            getOverallStats: jest.fn(),
          },
        },
        { provide: PrismaWriteService, useValue: {} },
        { provide: PrismaReadService, useValue: {} },
        { provide: QuotePdfService, useValue: { generateAndStore: jest.fn() } },
        { provide: ContractPdfService, useValue: { generateAndStore: jest.fn() } },
        { provide: QuoteLineItemLibraryService, useValue: { list: jest.fn(), create: jest.fn() } },
        { provide: DocumentGenerationService, useValue: { getLatestDocument: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<QuotesAdminController>(QuotesAdminController);
    adminService = module.get(QuotesAdminService);
    statsService = module.get(QuoteStatsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listQuotes', () => {
    it('should list quotes with parsed pagination', () => {
      adminService.listQuotes.mockResolvedValue([] as any);

      const result = controller.listQuotes('2', '10');

      expect(adminService.listQuotes).toHaveBeenCalledWith(2, 10, undefined, undefined);
      expect(result).resolves.toEqual([]);
    });

    it('should use default pagination options', () => {
      adminService.listQuotes.mockResolvedValue([] as any);
      controller.listQuotes(undefined, undefined);
      expect(adminService.listQuotes).toHaveBeenCalledWith(1, 20, undefined, undefined);
    });
  });

  describe('getStats', () => {
    it('should return stats', () => {
      statsService.getOverallStats.mockResolvedValue({ totalQuotes: 10 } as any);
      const result = controller.getStats();
      expect(result).resolves.toEqual({ totalQuotes: 10 });
    });
  });

  describe('createQuote', () => {
    it('should create a quote and set status to CREATED', async () => {
      adminService.createQuote.mockResolvedValue({ id: 'q1' } as any);
      const res = { status: jest.fn() } as any;
      const dto = { title: 'Test Quote' } as any;

      const result = await controller.createQuote('admin1', dto, res);

      expect(adminService.createQuote).toHaveBeenCalledWith('admin1', dto);
      expect(res.status).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(result).toEqual({ id: 'q1' });
    });
  });

  describe('sendQuote', () => {
    it('should send a quote', () => {
      adminService.sendQuote.mockResolvedValue({ status: true } as any);
      const result = controller.sendQuote('q1');
      expect(adminService.sendQuote).toHaveBeenCalledWith('q1');
      expect(result).resolves.toEqual({ status: true });
    });
  });

  describe('resendQuote', () => {
    it('should resend via resendQuote (not sendQuote)', () => {
      adminService.resendQuote.mockResolvedValue(true as any);
      const result = controller.resendQuote('q1');
      expect(adminService.resendQuote).toHaveBeenCalledWith('q1');
      expect(adminService.sendQuote).not.toHaveBeenCalled();
      expect(result).resolves.toBe(true);
    });
  });
});
