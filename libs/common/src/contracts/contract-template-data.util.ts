import { STANDARD_QUOTE_TERMS } from '../constants/standard-quote-terms.constants';

export type ContractTemplateQuote = {
  id?: string;
  quoteNumber?: string | null;
  contractNumber?: string | null;
  title?: string;
  description?: string;
  totalAmount: number;
  subtotal?: number;
  taxAmount?: number;
  currency: string;
  terms?: string | null;
  termsAndConditions?: string | null;
  paymentBreakdown?: unknown;
  paymentSchedule?: unknown;
  revisionsIncluded?: number;
  acceptedAt?: Date | null;
  signatureName?: string | null;
  validUntil?: Date;
  request?: { title?: string } | null;
  user?: { firstName: string; lastName: string; email: string };
};

function extractLineItems(paymentBreakdown: unknown): Array<Record<string, unknown>> {
  const raw = Array.isArray(paymentBreakdown) ? paymentBreakdown : [];
  return raw.map((item) => {
    const row = item as Record<string, unknown>;
    const unitPricePaise = Number(row.unitPrice ?? row.amount ?? 0);
    const quantity = Number(row.quantity ?? 1);
    const totalPaise = Number(
      row.totalPrice ?? row.total ?? row.amount ?? unitPricePaise * quantity,
    );
    return {
      description: String(row.description || row.name || 'Line item'),
      quantity,
      unitPricePaise,
      totalPaise,
    };
  });
}

export function buildContractTemplateData(
  quote: ContractTemplateQuote,
  company: Record<string, string>,
  options?: {
    draft?: boolean;
    signatureName?: string;
    acceptedAt?: string;
  },
): Record<string, unknown> {
  const clientName = quote.user ? `${quote.user.firstName} ${quote.user.lastName}`.trim() : '';
  const msaTerms = String(quote.terms ?? '').trim() || STANDARD_QUOTE_TERMS;
  const sowTerms = quote.termsAndConditions ? String(quote.termsAndConditions).trim() : '';

  return {
    isDraft: Boolean(options?.draft),
    contractNumber: quote.contractNumber || quote.quoteNumber || 'CTR-DRAFT',
    quoteNumber: quote.quoteNumber,
    quoteId: quote.id,
    acceptedAt:
      options?.acceptedAt ||
      (quote.acceptedAt
        ? quote.acceptedAt.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]),
    signatureName: options?.signatureName || quote.signatureName || '',
    msaTerms,
    sowTerms,
    terms: msaTerms,
    termsAndConditions: sowTerms,
    projectTitle: quote.request?.title || quote.title || '',
    description: quote.description || '',
    totalPaise: quote.totalAmount,
    subtotalPaise: quote.subtotal ?? quote.totalAmount,
    taxPaise: quote.taxAmount ?? 0,
    currency: quote.currency || 'INR',
    revisionsIncluded: quote.revisionsIncluded ?? 2,
    validUntil: quote.validUntil ? quote.validUntil.toISOString().split('T')[0] : '',
    items: extractLineItems(quote.paymentBreakdown),
    paymentSchedule: Array.isArray(quote.paymentSchedule) ? quote.paymentSchedule : [],
    company,
    client: {
      name: clientName,
      email: quote.user?.email || '',
    },
  };
}

export function resolveContractStatus(quote: { acceptedAt?: Date | null }): 'pending' | 'signed' {
  return quote.acceptedAt ? 'signed' : 'pending';
}
