import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import {
  BusinessLogicException,
  QuoteStatus,
  isQuoteLineItemBreakdown,
  resolveQuotePaymentSchedule,
  STANDARD_QUOTE_TERMS,
  resolveContractStatus,
} from '@nestlancer/common';

const RESOURCE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface QuoteSummary {
  id: string;
  requestId: string;
  requestTitle?: string;
  status: string;
  totalAmount: number;
  currency: string;
  validUntil: Date;
  createdAt: Date;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    amount: number;
    total: number;
  }>;
}

interface QuoteTimeline {
  estimatedStartDate?: Date;
  estimatedEndDate?: Date;
  phases?: Array<{
    name: string;
    duration: string;
    description?: string;
  }>;
}

interface QuoteScope {
  included: string[];
  excluded: string[];
}

interface QuoteDetail {
  id: string;
  requestId: string;
  status: string;
  title: string;
  description: string;
  totalAmount: number;
  subtotal?: number;
  taxPercentage?: number;
  taxAmount?: number;
  currency: string;
  validUntil: Date;
  daysRemaining: number;
  /** Billing line items (description / qty / unitPrice in paise). */
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    amount: number;
    total: number;
  }>;
  /** Payment schedule installments (deposit / mid / final). */
  paymentBreakdown: Array<{
    milestone: string;
    amount: number;
    percentage: number;
    dueOn: string;
  }>;
  paymentSchedule: unknown;
  timeline: QuoteTimeline;
  scope: QuoteScope;
  technicalDetails: Record<string, unknown>;
  terms: string;
  termsAndConditions?: string;
  requiresContract: boolean;
  contractStatus: 'pending' | 'signed';
  contractNumber?: string;
  contractSignedAt?: Date;
  attachments: Array<{
    id: string;
    name: string;
    url: string;
  }>;
  request: {
    id: string;
    title: string;
    status: string;
    createdAt: Date;
  };
  statusHistory: Array<{
    status: string;
    event: string;
    label: string;
    timestamp: Date;
    actor?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  viewedAt?: Date;
  acceptedAt?: Date;
  declinedAt?: Date;
  projectId?: string | null;
  project?: { id: string; status: string } | null;
}

const QUOTE_SORT_FIELDS = new Set(['createdAt', 'updatedAt', 'totalAmount', 'status']);

export function quoteListOrderBy(sortBy?: string, sortOrder?: string) {
  const field = (sortBy ?? 'createdAt').trim() || 'createdAt';
  const order = (sortOrder ?? 'desc').trim().toLowerCase() || 'desc';
  if (!QUOTE_SORT_FIELDS.has(field)) {
    throw new BadRequestException(
      `Invalid sortBy. Use one of: ${[...QUOTE_SORT_FIELDS].join(', ')}`,
    );
  }
  if (order !== 'asc' && order !== 'desc') {
    throw new BadRequestException('Invalid sortOrder. Use asc or desc');
  }
  return { [field]: order as 'asc' | 'desc' };
}

@Injectable()
export class QuotesService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  async getMyQuotes(
    userId: string,
    options: { page?: number; limit?: number; status?: string; sortBy?: string; sortOrder?: string } = {},
  ) {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));
    const where: Record<string, unknown> = {
      request: { userId },
      status: { notIn: [QuoteStatus.DRAFT, QuoteStatus.PENDING] },
    };

    if (options.status) {
      const raw = options.status.trim();
      // `all` is a list shortcut (same as omitting the filter). Unknown enums
      // must be 400 — Prisma throws 500 on an invalid QuoteStatus (NL-BUG-QUOTE-STATUS).
      if (raw && raw.toLowerCase() !== 'all') {
        const normalized = raw.replace(/([A-Z])/g, '_$1').replace(/^_/, '').toUpperCase();
        const allowed = new Set<string>(Object.values(QuoteStatus));
        if (!allowed.has(normalized)) {
          throw new BadRequestException(
            `Invalid quote status. Use one of: ${[...allowed].join(', ')}, or all`,
          );
        }
        if (normalized === QuoteStatus.DRAFT || normalized === QuoteStatus.PENDING) {
          return { items: [], total: 0, page, pageSize: limit, hasMore: false };
        }
        where.status = normalized;
      }
    }

    const [quotes, total] = await Promise.all([
      this.prismaRead.quote.findMany({
        where: where as any,
        include: {
          request: { select: { title: true, category: true } },
        },
        orderBy: quoteListOrderBy(options.sortBy, options.sortOrder),
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prismaRead.quote.count({ where: where as any }),
    ]);

    return {
      items: quotes.map((quote) => this.formatQuoteSummary(quote)),
      total,
      page,
      pageSize: limit,
      hasMore: page * limit < total,
    };
  }

  async getQuoteDetails(
    userId: string,
    quoteId: string,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<QuoteDetail> {
    if (!RESOURCE_ID.test(quoteId)) {
      throw new BusinessLogicException('Quote not found', 'QUOTE_001');
    }
    const quote = await this.prismaRead.quote.findFirst({
      where: {
        id: quoteId,
        request: { userId },
        status: { notIn: [QuoteStatus.DRAFT, QuoteStatus.PENDING] },
      },
      include: {
        request: { select: { id: true, title: true, status: true, createdAt: true } },
        project: { select: { id: true, status: true } },
      },
    });

    if (!quote) {
      throw new BusinessLogicException('Quote not found', 'QUOTE_001');
    }

    const viewEntry = {
      userId,
      ipAddress: meta?.ip ?? null,
      userAgent: meta?.userAgent ?? null,
      viewedAt: new Date().toISOString(),
    };
    const existingHistory = Array.isArray((quote as any).viewHistory)
      ? (quote as any).viewHistory
      : [];

    if (quote.status === QuoteStatus.SENT) {
      await this.prismaWrite.$transaction(async (tx: any) => {
        await tx.quote.update({
          where: { id: quoteId },
          data: {
            status: QuoteStatus.VIEWED,
            viewCount: { increment: 1 },
            viewHistory: [...existingHistory, viewEntry],
          } as any,
        });
        // NL-BUG-QUOTE-004: history is outbox-driven — emit VIEWED so the Event column fills.
        await tx.outbox.create({
          data: {
            type: 'QUOTE_VIEWED',
            aggregateType: 'QUOTE',
            aggregateId: quoteId,
            payload: { quoteId, userId, viewedAt: viewEntry.viewedAt },
          },
        });
      });
    } else {
      await this.prismaWrite.quote.update({
        where: { id: quoteId },
        data: {
          viewCount: { increment: 1 },
          viewHistory: [...existingHistory, viewEntry],
        } as any,
      });
    }

    return this.formatQuoteDetailResponse({
      ...quote,
      status: quote.status === QuoteStatus.SENT ? QuoteStatus.VIEWED : quote.status,
    });
  }

  private formatQuoteSummary(quote: any): QuoteSummary {
    return {
      id: quote.id,
      requestId: quote.requestId,
      requestTitle: quote.request?.title,
      status: this.formatStatusString(quote.status),
      totalAmount: quote.totalAmount,
      currency: quote.currency,
      validUntil: quote.validUntil,
      createdAt: quote.createdAt,
      lineItems: this.buildLineItems(quote),
    };
  }

  private formatQuoteDetailResponse(quote: any): QuoteDetail {
    const timeline = this.parseJsonField<QuoteTimeline>(quote.timeline, {});
    const scope = this.parseJsonField<QuoteScope>(quote.scope, { included: [], excluded: [] });
    const technicalDetails = this.parseJsonField<Record<string, unknown>>(
      quote.technicalDetails,
      {},
    );
    const paymentBreakdown = this.buildPaymentBreakdown(quote);
    const lineItems = this.buildLineItems(quote);

    return {
      id: quote.id,
      requestId: quote.requestId,
      status: this.formatStatusString(quote.status),
      title: quote.title || quote.request?.title || `Quote for Request ${quote.requestId}`,
      description: quote.description || '',
      totalAmount: quote.totalAmount,
      subtotal: typeof quote.subtotal === 'number' ? quote.subtotal : undefined,
      taxPercentage: typeof quote.taxPercentage === 'number' ? quote.taxPercentage : undefined,
      taxAmount: typeof quote.taxAmount === 'number' ? quote.taxAmount : undefined,
      currency: quote.currency,
      validUntil: quote.validUntil,
      daysRemaining: this.calculateDaysRemaining(quote.validUntil),
      lineItems,
      paymentBreakdown,
      paymentSchedule: this.resolveClientPaymentSchedule(quote),
      timeline,
      scope,
      technicalDetails,
      terms: String(quote.terms ?? '').trim() || STANDARD_QUOTE_TERMS,
      termsAndConditions: quote.termsAndConditions
        ? String(quote.termsAndConditions).trim() || undefined
        : undefined,
      requiresContract: quote.requiresContract !== false,
      contractStatus: resolveContractStatus(quote),
      contractNumber: quote.contractNumber ?? undefined,
      contractSignedAt: quote.acceptedAt ?? undefined,
      attachments: this.parseJsonField<Array<{ id: string; name: string; url: string }>>(
        quote.attachments,
        [],
      ),
      request: {
        id: quote.request?.id,
        title: quote.request?.title,
        status: this.formatStatusString(quote.request?.status),
        createdAt: quote.request?.createdAt,
      },
      statusHistory: this.buildStatusHistory(quote),
      createdAt: quote.createdAt,
      updatedAt: quote.updatedAt,
      sentAt: quote.createdAt, // When quote was first sent
      viewedAt: quote.status !== QuoteStatus.SENT ? quote.updatedAt : undefined,
      acceptedAt: quote.acceptedAt,
      declinedAt: quote.declinedAt,
      projectId: quote.project?.id ?? null,
      project: quote.project
        ? {
            id: quote.project.id,
            status: this.formatStatusString(quote.project.status),
          }
        : null,
    };
  }

  private formatStatusString(status: string): string {
    if (!status) return '';
    return status.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  private calculateDaysRemaining(validUntil: Date): number {
    const now = new Date().getTime();
    const expiry = new Date(validUntil).getTime();
    return Math.max(0, Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)));
  }

  private parseJsonField<T>(field: unknown, defaultValue: T): T {
    if (!field) return defaultValue;
    if (typeof field === 'object') return field as T;
    try {
      return JSON.parse(field as string) as T;
    } catch {
      return defaultValue;
    }
  }

  private buildLineItems(quote: any): Array<{
    name: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    amount: number;
    total: number;
  }> {
    const raw = this.parseJsonField<unknown>(quote.paymentBreakdown, []);
    if (!isQuoteLineItemBreakdown(raw) || !Array.isArray(raw)) {
      return [];
    }
    return raw.map((row: any) => {
      const quantity = Math.max(1, Number(row.quantity) || 1);
      const unitPrice = Math.round(Number(row.unitPrice) || 0);
      const totalPrice =
        typeof row.totalPrice === 'number' && row.totalPrice > 0
          ? Math.round(row.totalPrice)
          : unitPrice * quantity;
      const description = String(row.description ?? row.title ?? row.name ?? 'Line item');
      return {
        // NL-QUOTE-007: expose name so UIs that read title/name are not blank.
        name: String(row.name ?? row.title ?? description),
        description,
        quantity,
        unitPrice,
        totalPrice,
        amount: unitPrice,
        total: totalPrice,
      };
    });
  }

  private resolveClientPaymentSchedule(quote: any): unknown {
    const stored = this.parseJsonField<unknown>(quote.paymentSchedule, null);
    if (Array.isArray(stored) && stored.length > 0) return stored;
    try {
      const resolved = resolveQuotePaymentSchedule({
        totalAmountPaise: quote.totalAmount,
        paymentSchedule: quote.paymentSchedule,
        paymentBreakdown: quote.paymentBreakdown,
        timeline: quote.timeline,
      });
      return resolved.length > 0 ? resolved : [];
    } catch {
      return [];
    }
  }

  private buildPaymentBreakdown(
    quote: any,
  ): Array<{ milestone: string; amount: number; percentage: number; dueOn: string }> {
    const schedule = resolveQuotePaymentSchedule({
      totalAmountPaise: quote.totalAmount,
      paymentSchedule: quote.paymentSchedule,
      paymentBreakdown: quote.paymentBreakdown,
      timeline: quote.timeline,
    });

    return schedule.map((row) => ({
      milestone: row.label,
      amount: row.amountPaise,
      percentage: row.percentage ?? 0,
      dueOn:
        row.dueTrigger === 'on_accept'
          ? 'Upon acceptance'
          : row.dueTrigger === 'on_date'
            ? (row.dueDate ?? '')
            : 'Upon prior milestone approval',
    }));
  }

  private buildStatusHistory(
    quote: any,
  ): Array<{ status: string; event: string; label: string; timestamp: Date; actor?: string }> {
    const history: Array<{
      status: string;
      event: string;
      label: string;
      timestamp: Date;
      actor?: string;
    }> = [];
    const push = (status: string, label: string, timestamp: Date) => {
      history.push({
        status,
        event: status.toUpperCase(),
        label,
        timestamp,
      });
    };

    // Build history from available timestamps
    push('created', 'Created', quote.createdAt);

    if (quote.status !== QuoteStatus.DRAFT && quote.status !== QuoteStatus.PENDING) {
      push('sent', 'Sent', quote.createdAt);
    }

    if (
      quote.status === QuoteStatus.VIEWED ||
      quote.status === QuoteStatus.ACCEPTED ||
      quote.status === QuoteStatus.DECLINED
    ) {
      push('viewed', 'Viewed', quote.updatedAt);
    }

    if (quote.acceptedAt) {
      push('accepted', 'Accepted', quote.acceptedAt);
    }

    if (quote.declinedAt) {
      push('declined', 'Declined', quote.declinedAt);
    }

    return history.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }
}
