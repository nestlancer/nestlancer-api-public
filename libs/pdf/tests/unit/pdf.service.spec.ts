import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PdfService } from '../../src/pdf.service';

describe('PdfService', () => {
  let service: PdfService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => (key === 'PDF_DEV_HTML_FALLBACK' ? 'true' : undefined)),
          },
        },
      ],
    }).compile();

    service = module.get<PdfService>(PdfService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate PDF (falling back to HTML buffer if puppeteer fails)', async () => {
    const result = await service.generate({
      template: 'invoice',
      data: { invoiceNumber: 'INV-001', amount: '100' },
    });

    expect(result.buffer).toBeDefined();
    expect(result.filename).toContain('invoice');
    // If puppeteer is not in test env, it falls back to text/html
    expect(['application/pdf', 'text/html']).toContain(result.mimeType);
  });
});
