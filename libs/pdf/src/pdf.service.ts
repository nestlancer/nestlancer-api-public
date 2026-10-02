import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PdfGenerateOptions, PdfResult } from './interfaces/pdf.interface';
import { getInvoiceTemplate } from './templates/invoice.template';
import { getQuoteTemplate } from './templates/quote.template';
import { getReceiptTemplate } from './templates/receipt.template';
import { getContractTemplate } from './templates/contract.template';
import { getReminderTemplate } from './templates/reminder.template';

/** A4 content margins — matches files-templates/shared/print.css @page rules. */
const PDF_MARGINS = { top: '16mm', bottom: '20mm', left: '14mm', right: '14mm' } as const;

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(private readonly configService?: ConfigService) {}

  private getTemplate(templateName: string, data: Record<string, unknown>): string {
    switch (templateName) {
      case 'invoice':
        return getInvoiceTemplate(data);
      case 'quote':
        return getQuoteTemplate(data);
      case 'receipt':
        return getReceiptTemplate(data);
      case 'contract':
        return getContractTemplate(data);
      case 'reminder':
        return getReminderTemplate(data);
      default:
        throw new Error(`Unknown template: ${templateName}`);
    }
  }

  async generate(options: PdfGenerateOptions): Promise<PdfResult> {
    this.logger.log(`Generating PDF from template: ${options.template}`);
    const html = this.getTemplate(options.template, options.data);

    const devHtmlFallback =
      this.configService?.get<string>('PDF_DEV_HTML_FALLBACK') === 'true' ||
      process.env.PDF_DEV_HTML_FALLBACK === 'true';

    // Honor the flag before launching Chromium so unit tests and local
    // environments without a browser stay fast and deterministic.
    if (devHtmlFallback) {
      this.logger.warn('PDF_DEV_HTML_FALLBACK enabled — returning HTML as buffer');
      const buffer = Buffer.from(html, 'utf-8');
      return {
        buffer,
        filename: `${options.template}-${Date.now()}.pdf`,
        mimeType: 'text/html',
        size: buffer.length,
      };
    }

    let puppeteer: import('puppeteer').PuppeteerNode | null = null;
    try {
      const puppeteerModule = await import('puppeteer');
      const resolved = (puppeteerModule.default ??
        puppeteerModule) as import('puppeteer').PuppeteerNode;
      if (typeof resolved.launch !== 'function') {
        throw new Error('Puppeteer launch is not available');
      }
      puppeteer = resolved;
    } catch (err) {
      throw new Error(`Puppeteer is required for PDF generation: ${(err as Error).message}`);
    }

    const browser = await puppeteer.launch({
      headless: true,
      executablePath:
        this.configService?.get<string>('PUPPETEER_EXECUTABLE_PATH') ||
        process.env.PUPPETEER_EXECUTABLE_PATH ||
        undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const page = await browser.newPage();
      page.setDefaultTimeout(45_000);
      page.setDefaultNavigationTimeout(45_000);
      // Data-URI logos do not need network idle; networkidle0 can hang under load (receipt 504s).
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30_000 });

      const pdfBuffer = await page.pdf({
        format: options.format || 'A4',
        landscape: options.landscape || false,
        printBackground: true,
        // NL-BUG-PDF-003: page numbers via Chromium footer (run-header/footer stay in HTML).
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate: `<div style="width:100%;font-size:8px;padding:0 14mm;color:#64748b;display:flex;justify-content:space-between;align-items:center;">
          <span></span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          <span></span>
        </div>`,
        margin: { ...PDF_MARGINS, bottom: '22mm' },
        timeout: 45_000,
      });

      const buffer = Buffer.from(pdfBuffer);
      const filename = `${options.template}-${Date.now()}.pdf`;

      this.logger.log(`PDF generated: ${filename} (${buffer.length} bytes)`);

      return {
        buffer,
        filename,
        mimeType: 'application/pdf',
        size: buffer.length,
      };
    } finally {
      await browser.close();
    }
  }
}
