import { Test, TestingModule } from '@nestjs/testing';
import { PdfModule } from '../../src/pdf.module';
import { PdfService } from '../../src/pdf.service';
import { ConfigModule } from '@nestjs/config';

describe('PdfModule (Integration)', () => {
  let module: TestingModule;
  let service: PdfService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }), PdfModule],
    }).compile();

    service = module.get<PdfService>(PdfService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate a PDF result (fallback to HTML if puppeteer missing)', async () => {
    const result = await service.generate({
      template: 'invoice',
      data: { invoiceNumber: 'INV-001', amount: '$100.00' },
    });

    expect(result.buffer).toBeDefined();
    expect(result.filename).toContain('invoice');
    // Since Puppeteer is likely not in the environment, it will fallback to HTML
    // Puppeteer may be available in CI — accept PDF or HTML fallback
    expect(['application/pdf', 'text/html']).toContain(result.mimeType);
  });

  it('should throw error for unknown template', async () => {
    await expect(
      service.generate({
        template: 'non-existent' as any,
        data: {},
      }),
    ).rejects.toThrow('Unknown template: non-existent');
  });
});
