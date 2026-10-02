import { Injectable } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import {
  BusinessLogicException,
  computeQuoteTotalsPaise,
  normalizePaymentScheduleInput,
  buildPaymentScheduleFromPreset,
  resolveClientTierDiscount,
  isQuoteLineItemBreakdown,
  toRupees,
  toPaise,
  STANDARD_QUOTE_TERMS,
  type PaymentSchedulePresetId,
  type QuoteTotalsPaise,
} from '@nestlancer/common';
import { CreateQuoteDto } from '../dto/create-quote.dto';
import { QuotePrefillDto } from '../dto/quote-prefill.dto';
import { mapPackageToQuoteItems } from '../utils/quote-package-prefill.util';

type QuoteItemInput = { description: string; quantity: number; unitPrice: number };

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'P2002'
  );
}

@Injectable()
export class QuotesAdminService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  async createQuote(requestId: string, adminId: string, dto: CreateQuoteDto) {
    const request = await this.prismaRead.projectRequest.findFirst({
      where: { id: requestId, deletedAt: null },
      include: {
        user: { select: { clientTier: true } },
        servicePackage: true,
      },
    });

    if (!request) throw new BusinessLogicException('Request not found', 'REQUEST_001');

    const quoteEligible = ['SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED'];
    if (!quoteEligible.includes(request.status)) {
      throw new BusinessLogicException(
        'Quotes can only be created after the client submits the request',
        'REQUEST_005',
      );
    }

    if (request.status === 'QUOTED') {
      throw new BusinessLogicException('Request already has active quote', 'REQUEST_006');
    }

    const existingQuote = await this.prismaRead.quote.findUnique({
      where: { requestId },
      select: { id: true },
    });
    if (existingQuote) {
      throw new BusinessLogicException('Request already has a quote', 'REQUEST_006');
    }

    const items = await this.resolveQuoteItems(dto, request);
    if (!items.length) {
      throw new BusinessLogicException(
        'At least one line item is required. Set prefillFromPackage: true or provide items[].',
        'QUOTE_011',
      );
    }

    const revisionsIncluded =
      dto.revisionsIncluded ?? (request as any).servicePackage?.revisionsIncluded ?? 2;

    const requiresContract = dto.requiresContract ?? true;
    const additionalRevisionCostPaise =
      dto.additionalRevisionCost != null ? toPaise(dto.additionalRevisionCost) : undefined;

    let totals = computeQuoteTotalsPaise(items, dto.taxPercentage);
    // Only apply tier discount when the admin explicitly opts in — silent VIP ×0.9
    // on computed totals caused NL-BUG-PAY-001 downstream (schedule/milestones/PDFs).
    if (dto.applyClientTierDiscount === true) {
      totals = this.applyClientTierDiscount(totals, (request as any).user?.clientTier);
    }

    const paymentSchedule = dto.paymentSchedule?.length
      ? normalizePaymentScheduleInput(dto.paymentSchedule, totals.totalAmount, true)
      : buildPaymentScheduleFromPreset(
          (dto.schedulePreset ?? '50-50') as PaymentSchedulePresetId,
          totals.totalAmount,
        );

    const termsWarning = this.checkTermsRevisionAlignment(
      dto.termsAndConditions,
      revisionsIncluded,
    );

    const quote = await this.prismaWrite.$transaction(async (tx: any) => {
      let newQuote;
      try {
        newQuote = await tx.quote.create({
          data: {
            requestId,
            userId: request.userId,
            createdById: adminId,
            title: request.title,
            description: request.description,
            status: 'DRAFT',
            subtotal: totals.subtotal,
            taxPercentage: dto.taxPercentage,
            taxAmount: totals.taxAmount,
            totalAmount: totals.totalAmount,
            currency: dto.currency,
            validUntil: new Date(dto.validUntil),
            terms: STANDARD_QUOTE_TERMS,
            termsAndConditions: dto.termsAndConditions,
            internalNotes: dto.internalNotes,
            // DRAFT until admin Send — avoids premature client notifs / "Quote not found"
            paymentBreakdown: totals.paymentBreakdown as any,
            paymentSchedule: paymentSchedule as any,
            requiresContract,
            revisionsIncluded,
            ...(additionalRevisionCostPaise != null
              ? { additionalRevisionCost: additionalRevisionCostPaise }
              : {}),
          } as any,
        });
      } catch (error: unknown) {
        if (isUniqueViolation(error)) {
          throw new BusinessLogicException('Request already has a quote', 'REQUEST_006');
        }
        throw error;
      }

      // Do not mark request QUOTED or emit client-facing events until Send.
      await tx.outbox.create({
        data: {
          type: 'QUOTE_CREATED',
          aggregateType: 'QUOTE',
          aggregateId: newQuote.id,
          payload: { quoteId: newQuote.id, requestId, status: 'DRAFT' },
        },
      });

      return newQuote;
    });

    return {
      id: quote.id,
      requestId: quote.requestId,
      status: 'draft',
      amount: {
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        currency: dto.currency,
      },
      items: totals.paymentBreakdown,
      paymentSchedule,
      schedulePreset: dto.schedulePreset ?? (dto.paymentSchedule?.length ? 'custom' : '50-50'),
      requiresContract,
      revisionsIncluded,
      ...(termsWarning ? { _warnings: [termsWarning] } : {}),
      createdAt: quote.createdAt,
    };
  }

  async suggestQuotePrefill(requestId: string, dto: QuotePrefillDto) {
    const request = await this.prismaRead.projectRequest.findFirst({
      where: { id: requestId, deletedAt: null },
      include: { servicePackage: true },
    });

    if (!request) throw new BusinessLogicException('Request not found', 'REQUEST_001');

    const existingQuote = await this.prismaRead.quote.findUnique({
      where: { requestId },
    });
    if (existingQuote) {
      throw new BusinessLogicException('Request already has a quote', 'REQUEST_006');
    }

    const source = await this.prismaRead.quote.findUnique({
      where: { id: dto.sourceQuoteId },
    });
    if (!source) {
      throw new BusinessLogicException('Source quote not found', 'QUOTE_001');
    }

    const suggestedItems = this.extractLineItemsFromQuote(source);
    const suggestedSchedulePreset = this.inferSchedulePreset((source as any).paymentSchedule);

    return {
      requestId,
      sourceQuoteId: dto.sourceQuoteId,
      suggestedItems,
      suggestedSchedulePreset,
      suggestedTermsAndConditions: source.termsAndConditions ?? undefined,
      suggestedRevisionsIncluded: source.revisionsIncluded,
      suggestedRequiresContract: source.requiresContract,
      suggestedTaxPercentage: source.taxPercentage,
      suggestedCurrency: source.currency,
      _meta: {
        note: 'Suggestions only — edit before POST /admin/requests/:id/quotes',
        deprecatedAlternative: 'POST /admin/quotes/:id/duplicate without targetRequestId',
      },
    };
  }

  private async resolveQuoteItems(
    dto: CreateQuoteDto,
    request: { servicePackage?: { deliverables: unknown; addOns: unknown } | null },
  ): Promise<QuoteItemInput[]> {
    if (dto.items?.length) {
      return dto.items;
    }

    if (dto.prefillFromPackage && request.servicePackage) {
      return mapPackageToQuoteItems(
        request.servicePackage.deliverables,
        request.servicePackage.addOns,
        dto.includePackageAddOns ?? false,
      );
    }

    return [];
  }

  private extractLineItemsFromQuote(quote: {
    paymentBreakdown: unknown;
    subtotal: number;
    taxPercentage: number;
  }): QuoteItemInput[] {
    const breakdown = quote.paymentBreakdown;
    if (isQuoteLineItemBreakdown(breakdown) && Array.isArray(breakdown)) {
      return breakdown.map((row: any) => ({
        description: String(row.description ?? 'Line item'),
        quantity: Math.max(1, Number(row.quantity) || 1),
        unitPrice: toRupees(Number(row.unitPrice) || 0),
      }));
    }

    return [];
  }

  private inferSchedulePreset(paymentSchedule: unknown): PaymentSchedulePresetId | 'custom' {
    if (!Array.isArray(paymentSchedule) || paymentSchedule.length === 0) {
      return '50-50';
    }

    const percentages = paymentSchedule
      .map((row: any) => row?.percentage)
      .filter((p: unknown) => typeof p === 'number');

    if (percentages.join(',') === '50,50') return '50-50';
    if (percentages.join(',') === '30,70') return '30-70';
    if (percentages.join(',') === '30,40,30') return '30-40-30';
    if (percentages.join(',') === '25,25,25,25') return '25-25-25-25';
    if (percentages.length === 1 && percentages[0] === 100) return '100-upfront';

    return 'custom';
  }

  private checkTermsRevisionAlignment(
    terms: string | undefined,
    revisionsIncluded: number,
  ): string | null {
    if (!terms) return null;
    const lower = terms.toLowerCase();
    if (lower.includes('unlimited') && revisionsIncluded < 99) {
      return `termsAndConditions mentions unlimited revisions but revisionsIncluded is ${revisionsIncluded}`;
    }
    return null;
  }

  private applyClientTierDiscount(totals: QuoteTotalsPaise, clientTier?: string): QuoteTotalsPaise {
    const discountPct = resolveClientTierDiscount(clientTier ?? 'NEW');
    if (discountPct <= 0) return totals;

    const discountPaise = Math.round(totals.totalAmount * (discountPct / 100));
    if (discountPaise <= 0) return totals;

    return {
      ...totals,
      subtotal: Math.max(0, totals.subtotal - discountPaise),
      totalAmount: Math.max(0, totals.totalAmount - discountPaise),
    };
  }
}
