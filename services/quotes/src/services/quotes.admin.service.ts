import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import {
  BusinessLogicException,
  QuoteStatus,
  assertValidTransition,
  normalizePaymentScheduleInput,
  listPaymentSchedulePresets,
  STANDARD_QUOTE_TERMS,
  isQuoteLineItemBreakdown,
} from '@nestlancer/common';
import { CreateQuoteAdminDto } from '../dto/create-quote.admin.dto';
import { quoteListOrderBy } from './quotes.service';

function toQuoteStatusEnum(status: string): string {
  const normalized = status.replace(/([A-Z])/g, '_$1').replace(/^_/, '').toUpperCase();
  const allowed = new Set<string>(Object.values(QuoteStatus));
  if (!allowed.has(normalized)) {
    throw new BadRequestException(
      `Invalid quote status. Use one of: ${[...allowed].join(', ')}, all, or inbox`,
    );
  }
  return normalized;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'P2002'
  );
}

function parseJsonField<T>(field: unknown, defaultValue: T): T {
  if (!field) return defaultValue;
  if (typeof field === 'object') return field as T;
  try {
    return JSON.parse(field as string) as T;
  } catch {
    return defaultValue;
  }
}

/** Build client-compatible line items from quote.paymentBreakdown JSON. */
export function buildAdminQuoteLineItems(quote: {
  paymentBreakdown?: unknown;
}): Array<{
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  amount: number;
  total: number;
}> {
  const raw = parseJsonField<unknown>(quote.paymentBreakdown, []);
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

/** Admin list filters: default shows all quotes; `inbox` is the active pipeline shortcut. */
function buildAdminQuoteStatusWhere(status?: string): Record<string, unknown> {
  const raw = (status ?? '').trim();
  if (!raw || raw.toLowerCase() === 'all') {
    // Include ACCEPTED/DECLINED/EXPIRED — default empty list was hiding real quotes (NL-BUG-QUOTE-001).
    return {};
  }
  const key = raw.toLowerCase();
  if (key === 'inbox') {
    return {
      status: { in: ['DRAFT', 'PENDING', 'CHANGES_REQUESTED', 'REVISED', 'SENT', 'VIEWED'] },
    };
  }
  return { status: toQuoteStatusEnum(raw) };
}

@Injectable()
export class QuotesAdminService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  async listQuotes(
    page: number,
    limit: number,
    userId?: string,
    status?: string,
    sortBy?: string,
    sortOrder?: string,
  ) {
    const where: Record<string, unknown> = { ...buildAdminQuoteStatusWhere(status) };
    if (userId) where.userId = userId;
    const [quotes, total] = await Promise.all([
      this.prismaRead.quote.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: quoteListOrderBy(sortBy, sortOrder),
        include: { user: { select: { id: true, firstName: true, email: true } } },
      }),
      this.prismaRead.quote.count({ where }),
    ]);

    return {
      data: quotes.map((q) => ({
        id: q.id,
        title: q.title,
        status: q.status.toLowerCase().replace(/_([a-z])/g, (g) => g[1].toUpperCase()),
        totalAmount: q.totalAmount,
        currency: q.currency,
        userId: q.userId,
        client: q.user,
        createdAt: q.createdAt,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // Example admin creation (bypassing normal flow if needed, but normally handled in RequestsService)
  async createQuote(adminId: string, dto: CreateQuoteAdminDto) {
    // Basic validation implementation
    const request = await this.prismaRead.projectRequest.findUnique({
      where: { id: dto.requestId },
      select: { id: true, userId: true },
    });
    if (!request) throw new BusinessLogicException('Request not found', 'QUOTE_007');

    const totalBreakdown = dto.paymentBreakdown.reduce((sum, item) => sum + item.amount, 0);
    if (totalBreakdown !== dto.totalAmount) {
      throw new BusinessLogicException(
        'Payment breakdown does not match total amount',
        'QUOTE_009',
      );
    }

    const totalPercentage = dto.paymentBreakdown.reduce((sum, item) => sum + item.percentage, 0);
    if (Math.round(totalPercentage) !== 100) {
      throw new BusinessLogicException(
        'Payment breakdown percentages must sum to 100',
        'QUOTE_010',
      );
    }

    // NL-BUG-PAY-001: this endpoint accepts explicit totals in paise. Persist as-sent.
    // Do NOT apply client-tier discounts here — VIP 10% silently rewrote admin totals
    // (×0.9; previously ×90 when combined with a mistaken toPaise). Tier discounts belong
    // on list-price / line-item quote builders with explicit disclosure, not final totals.
    const quoteTotal = Math.round(Number(dto.totalAmount));
    const breakdown = dto.paymentBreakdown.map((row) => ({
      ...row,
      amount: Math.round(Number(row.amount)),
    }));

    const paymentSchedule = normalizePaymentScheduleInput(
      breakdown.map((row, index) => ({
        label: row.description,
        amount: row.amount,
        percentage: row.percentage,
        dueTrigger: index === 0 ? 'on_accept' : row.dueDate ? 'on_date' : 'on_prior_approved',
        dueDate: row.dueDate,
        type: row.type as any,
      })),
      quoteTotal,
      false,
    );

    const existing = await this.prismaRead.quote.findUnique({
      where: { requestId: dto.requestId },
      select: { id: true },
    });
    if (existing) {
      throw new BusinessLogicException('Request already has a quote', 'REQUEST_006');
    }

    let quote;
    try {
      quote = await this.prismaWrite.quote.create({
        data: {
          requestId: dto.requestId,
          userId: request.userId,
          createdById: adminId,
          title: dto.title,
          description: dto.description,
          status: 'DRAFT',
          subtotal: quoteTotal,
          taxPercentage: 0,
          taxAmount: 0,
          totalAmount: quoteTotal,
          currency: dto.currency,
          validUntil: new Date(dto.validUntil),
          terms: STANDARD_QUOTE_TERMS,
          termsAndConditions: dto.terms,
          internalNotes: dto.notes,
          paymentBreakdown: breakdown as any,
          paymentSchedule: paymentSchedule as any,
        } as any,
      });
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw new BusinessLogicException('Request already has a quote', 'REQUEST_006');
      }
      throw error;
    }

    await this.prismaWrite.outbox.create({
      data: {
        type: 'QUOTE_CREATED',
        aggregateType: 'QUOTE',
        aggregateId: quote.id,
        payload: { quoteId: quote.id, requestId: dto.requestId, status: 'DRAFT' },
      },
    });

    return {
      id: quote.id,
      status: 'draft',
      totalAmount: quote.totalAmount,
      currency: quote.currency,
      paymentSchedule,
    };
  }

  listPaymentSchedulePresets() {
    return listPaymentSchedulePresets();
  }

  async sendQuote(quoteId: string) {
    const quote = await this.prismaWrite.quote.findUnique({ where: { id: quoteId } });
    if (!quote) throw new BusinessLogicException('Quote not found', 'QUOTE_001');

    // NL-BUG-QUOTE-3: already-sent quotes must not re-run SENT→SENT (same-status is
    // treated as valid by assertValidTransition) and must not emit a second QUOTE_SENT.
    // Use /resend for intentional notification replay.
    if (quote.status === 'SENT' || quote.status === 'VIEWED') {
      return true;
    }

    assertValidTransition('QUOTE', quote.status, 'SENT');

    await this.prismaWrite.$transaction(async (tx: any) => {
      await tx.quote.update({
        where: { id: quoteId },
        data: { status: 'SENT' },
      });

      const request = await tx.projectRequest.findUnique({
        where: { id: quote.requestId },
        select: { id: true, status: true },
      });

      if (
        request &&
        request.status !== 'QUOTED' &&
        request.status !== 'CONVERTED_TO_PROJECT' &&
        request.status !== 'CANCELLED' &&
        request.status !== 'REJECTED'
      ) {
        const oldStatus = request.status;
        await tx.projectRequest.update({
          where: { id: request.id },
          data: { status: 'QUOTED' },
        });
        await tx.requestStatusHistory.create({
          data: {
            requestId: request.id,
            status: 'QUOTED',
            note: `Quote sent — request updated from ${oldStatus}`,
          },
        });
        await tx.outbox.create({
          data: {
            type: 'REQUEST_STATUS_UPDATED',
            aggregateType: 'REQUEST',
            aggregateId: request.id,
            payload: {
              requestId: request.id,
              oldStatus,
              newStatus: 'QUOTED',
              quoteId,
            },
          },
        });
      }

      await tx.outbox.create({
        data: {
          type: 'QUOTE_SENT',
          aggregateType: 'QUOTE',
          aggregateId: quoteId,
          payload: { quoteId, userId: quote.userId },
        },
      });
    });

    return true;
  }

  /**
   * Re-notify the client about an already-sent quote without recreating status history.
   * Distinct from sendQuote so double-clicks on "Send" cannot fan out duplicate emails.
   */
  async resendQuote(quoteId: string) {
    const quote = await this.prismaWrite.quote.findUnique({ where: { id: quoteId } });
    if (!quote) throw new BusinessLogicException('Quote not found', 'QUOTE_001');
    if (!['SENT', 'VIEWED', 'EXPIRED'].includes(quote.status)) {
      throw new BusinessLogicException(
        'Quote can only be resent when it is already sent, viewed, or expired',
        'QUOTE_011',
      );
    }

    await this.prismaWrite.outbox.create({
      data: {
        type: 'QUOTE_SENT',
        aggregateType: 'QUOTE',
        aggregateId: quoteId,
        payload: { quoteId, userId: quote.userId, resent: true },
      },
    });

    return true;
  }

  async extendQuote(quoteId: string, extendDays = 14) {
    const quote = await this.prismaRead.quote.findUnique({ where: { id: quoteId } });
    if (!quote) throw new BusinessLogicException('Quote not found', 'QUOTE_001');
    if (!['EXPIRED', 'SENT', 'VIEWED'].includes(quote.status)) {
      throw new BusinessLogicException('Quote cannot be extended in current status', 'QUOTE_010');
    }

    assertValidTransition('QUOTE', quote.status, 'SENT');

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + extendDays);

    await this.prismaWrite.$transaction(async (tx: any) => {
      await tx.quote.update({
        where: { id: quoteId },
        data: { status: 'SENT', validUntil, expiredAt: null } as any,
      });

      const request = await tx.projectRequest.findUnique({
        where: { id: quote.requestId },
        select: { id: true, status: true },
      });

      if (request?.status === 'EXPIRED_QUOTE') {
        await tx.projectRequest.update({
          where: { id: request.id },
          data: { status: 'QUOTED' },
        });
        await tx.requestStatusHistory.create({
          data: {
            requestId: request.id,
            status: 'QUOTED',
            note: `Quote extended — request restored from EXPIRED_QUOTE`,
          },
        });
        await tx.outbox.create({
          data: {
            type: 'REQUEST_STATUS_UPDATED',
            aggregateType: 'REQUEST',
            aggregateId: request.id,
            payload: {
              requestId: request.id,
              oldStatus: 'EXPIRED_QUOTE',
              newStatus: 'QUOTED',
              quoteId,
            },
          },
        });
      }

      await tx.outbox.create({
        data: {
          type: 'QUOTE_EXTENDED',
          aggregateType: 'QUOTE',
          aggregateId: quoteId,
          payload: { quoteId, userId: quote.userId, validUntil: validUntil.toISOString() },
        },
      });
    });

    return { quoteId, validUntil, status: 'SENT' };
  }
}
