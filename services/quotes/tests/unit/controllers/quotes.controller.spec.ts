import { Test, TestingModule } from '@nestjs/testing';
import { QuotesController } from '../../../src/controllers/quotes.controller';
import { QuotesService } from '../../../src/services/quotes.service';
import { QuoteStatusService } from '../../../src/services/quote-status.service';
import { QuotePdfService } from '../../../src/services/quote-pdf.service';
import { QuoteStatsService } from '../../../src/services/quote-stats.service';
import { JwtAuthGuard } from '@nestlancer/auth-lib';

describe('QuotesController', () => {
  let controller: QuotesController;
  let statusService: QuoteStatusService;
  let pdfService: QuotePdfService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuotesController],
      providers: [
        {
          provide: QuotesService,
          useValue: { getMyQuotes: jest.fn(), getQuoteDetails: jest.fn() },
        },
        {
          provide: QuoteStatusService,
          useValue: { acceptQuote: jest.fn(), declineQuote: jest.fn(), requestChanges: jest.fn() },
        },
        { provide: QuotePdfService, useValue: { getPdfDownloadUrl: jest.fn() } },
        { provide: QuoteStatsService, useValue: { getUserStats: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<QuotesController>(QuotesController);
    statusService = module.get<QuoteStatusService>(QuoteStatusService);
    pdfService = module.get<QuotePdfService>(QuotePdfService);
  });

  describe('acceptQuote', () => {
    it('should call statusService.acceptQuote', async () => {
      const mockResult = { status: 'accepted' };
      jest.spyOn(statusService, 'acceptQuote').mockResolvedValue(mockResult as any);

      const dto: any = {
        acceptTerms: true,
        signatureName: 'Test',
        signatureDate: new Date().toISOString(),
      };
      const result = await controller.acceptQuote('user1', 'quote1', dto);

      expect(result).toEqual(mockResult);
      expect(statusService.acceptQuote).toHaveBeenCalledWith('user1', 'quote1', dto);
    });
  });

  describe('downloadPdf', () => {
    it('should return presigned download metadata', async () => {
      const mockResult = {
        quoteId: 'quote1',
        documentNumber: 'NL-QTE-2026-000001',
        version: 1,
        downloadUrl: 'https://signed.example/quote.pdf',
        expiresIn: 3600,
      };
      jest.spyOn(pdfService, 'getPdfDownloadUrl').mockResolvedValue(mockResult);

      const result = await controller.downloadPdf('user1', 'quote1');

      expect(pdfService.getPdfDownloadUrl).toHaveBeenCalledWith('user1', 'quote1');
      expect(result).toEqual(mockResult);
    });
  });
});
