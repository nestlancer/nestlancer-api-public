import { getInvoiceTemplate } from '../../src/templates/invoice.template';
import { buildWatermark, buildPageHeader } from '../../src/layout/document-layout';

describe('document layout', () => {
  it('should render watermark with logo icon data URI', () => {
    const html = buildWatermark();
    expect(html).toContain('class="watermark"');
    expect(html).toContain('data:image/svg+xml;base64,');
  });

  it('should render page header with full logo and company details', () => {
    const html = buildPageHeader({
      company: {
        name: 'Nestlancer',
        legalName: 'Nestlancer Pvt Ltd',
        address: '123 Business Park',
        gst: '29ABCDE1234F1Z5',
        email: 'billing@nestlancer.com',
        phone: '+91 98765 43210',
        website: 'nestlancer.com',
      },
      meta: {
        documentType: 'Invoice',
        documentNumber: 'NL-INV-2026-000001',
        date: '2026-06-09',
      },
    });

    expect(html).toContain('class="brand"');
    expect(html).toContain('Nestlancer Pvt Ltd');
    expect(html).toContain('NL-INV-2026-000001');
    expect(html).toContain('run-header');
  });

  it('should include branding in invoice template output', () => {
    const html = getInvoiceTemplate({
      invoiceNumber: 'NL-INV-2026-000001',
      invoiceDate: '2026-06-09',
      totalPaise: 118000,
      subtotalPaise: 100000,
      taxPaise: 18000,
      company: {
        name: 'Nestlancer',
        legalName: 'Nestlancer Pvt Ltd',
        email: 'billing@nestlancer.com',
      },
      client: { name: 'Jane Doe', email: 'jane@example.com' },
      items: [
        {
          description: 'Milestone 1',
          quantity: 1,
          unitPricePaise: 100000,
          totalPaise: 100000,
        },
      ],
    });

    expect(html).toContain('class="watermark"');
    expect(html).toContain('data:image/svg+xml;base64,');
    expect(html).toContain('Recipient (Buyer)');
    expect(html).toContain('Jane Doe');
    expect(html).toContain('Total Amount Due');
    expect(html).toContain('TAX INVOICE');
  });
});
