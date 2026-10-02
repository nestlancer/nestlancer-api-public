import PDFDocument from 'pdfkit';
import { BRAND_COLORS, getLogoFullBuffer, getLogoIconBuffer } from '../utils/brand.util';

interface ReportSection {
  title: string;
  rows: Array<[string, string]>;
}

function flattenData(prefix: string, value: unknown, rows: Array<[string, string]>): void {
  if (value === null || value === undefined) {
    rows.push([prefix, '—']);
    return;
  }
  if (typeof value !== 'object' || value instanceof Date) {
    rows.push([prefix, String(value instanceof Date ? value.toISOString() : value)]);
    return;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      rows.push([prefix, '[]']);
      return;
    }
    value.forEach((item, index) => flattenData(`${prefix}[${index}]`, item, rows));
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    flattenData(nextKey, nested, rows);
  }
}

function buildSections(data: Record<string, unknown>): ReportSection[] {
  const sections: ReportSection[] = [];
  for (const [key, value] of Object.entries(data)) {
    const rows: Array<[string, string]> = [];
    flattenData('', value, rows);
    sections.push({ title: key, rows });
  }
  return sections;
}

function formatReportTitle(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const FOOTER_RESERVE = 56;

function drawPageFooter(doc: PDFKit.PDFDocument, pageIndex: number, pageCount: number): void {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const contentWidth = pageWidth - 100;
  const footerY = pageHeight - 40;

  doc
    .fontSize(8)
    .fillColor(BRAND_COLORS.muted)
    .text('Nestlancer Analytics · Confidential internal report', 50, footerY, {
      width: contentWidth * 0.65,
      align: 'left',
      lineBreak: false,
    });

  doc
    .fontSize(8)
    .fillColor(BRAND_COLORS.muted)
    .text(`Page ${pageIndex + 1} of ${pageCount}`, 50 + contentWidth * 0.65, footerY, {
      width: contentWidth * 0.35,
      align: 'right',
      lineBreak: false,
    });
}

export function buildAnalyticsReportPdf(
  type: string,
  period: string,
  data: unknown,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      bufferPages: true,
      margins: { top: 56, bottom: FOOTER_RESERVE, left: 50, right: 50 },
    });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const contentWidth = pageWidth - 100;
    const contentBottom = pageHeight - FOOTER_RESERVE - 8;

    try {
      doc.save();
      doc.opacity(0.05);
      doc.image(getLogoIconBuffer(), pageWidth / 2 - 80, pageHeight / 2 - 80, { width: 160 });
      doc.restore();
    } catch {
      // Logo optional in constrained environments
    }

    try {
      doc.image(getLogoFullBuffer(), 50, 40, { height: 28 });
    } catch {
      doc.fontSize(16).fillColor(BRAND_COLORS.navy).text('Nestlancer', 50, 45);
    }

    doc
      .fontSize(20)
      .fillColor(BRAND_COLORS.navy)
      .text(`${formatReportTitle(type)} Report`, 50, 82);

    doc
      .fontSize(11)
      .fillColor(BRAND_COLORS.muted)
      .text(`Period: ${period}  ·  Generated: ${new Date().toISOString().split('T')[0]}`, 50, 110);

    doc
      .moveTo(50, 130)
      .lineTo(pageWidth - 50, 130)
      .strokeColor(BRAND_COLORS.border)
      .stroke();

    let y = 148;
    const sections = buildSections((data as Record<string, unknown>) || {});

    for (const section of sections) {
      if (y > contentBottom - 40) {
        doc.addPage();
        y = 56;
      }

      doc.fontSize(13).fillColor(BRAND_COLORS.navy).text(section.title, 50, y);
      y += 22;

      for (const [label, value] of section.rows) {
        const valueHeight = Math.max(
          doc.heightOfString(value, { width: contentWidth - 210 }),
          14,
        );
        if (y + valueHeight > contentBottom) {
          doc.addPage();
          y = 56;
        }
        doc.fontSize(10).fillColor(BRAND_COLORS.muted).text(label, 50, y, { width: 200 });
        doc
          .fontSize(10)
          .fillColor(BRAND_COLORS.text)
          .text(value, 260, y, { width: contentWidth - 210 });
        y += valueHeight + 4;
      }

      y += 12;
    }

    // Stamp footers on every page (fixes trailing footer-only page + missing page numbers).
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      drawPageFooter(doc, i, range.count);
    }

    doc.end();
  });
}
