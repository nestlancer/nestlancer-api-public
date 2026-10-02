import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  Res,
  HttpCode,
  GoneException,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiStandardResponse,
  ApiStandardResponses,
  BusinessLogicException,
  UserRole,
  computeQuoteTotalsPaise,
  assertValidTransition,
  buildPaymentScheduleFromPreset,
  normalizePaymentScheduleInput,
  type PaymentSchedulePresetId,
  clampPagination,
} from '@nestlancer/common';
import { ActiveUser, JwtAuthGuard, RolesGuard, Roles } from '@nestlancer/auth-lib';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { QuotesAdminService, buildAdminQuoteLineItems } from '../services/quotes.admin.service';
import { QuoteLineItemLibraryService } from '../services/quote-line-item-library.service';
import { QuoteStatsService } from '../services/quote-stats.service';
import { QuotePdfService } from '../services/quote-pdf.service';
import { ContractPdfService } from '../services/contract-pdf.service';
import { DocumentGenerationService } from '@nestlancer/documents';
import { DocumentType } from '@prisma/client';
import { CreateQuoteAdminDto } from '../dto/create-quote.admin.dto';
import { UpdateQuoteAdminDto } from '../dto/update-quote.admin.dto';
import { CreateLineItemBlockDto, UpdateLineItemBlockDto } from '../dto/line-item-library.dto';
import { DuplicateQuoteDto } from '../dto/duplicate-quote.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';

/**
 * Controller for administrative management of quotes and proposals.
 */
@ApiTags('Admin/Quotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/quotes')
@ApiStandardResponses()
export class QuotesAdminController {
  constructor(
    private readonly adminService: QuotesAdminService,
    private readonly lineItemLibrary: QuoteLineItemLibraryService,
    private readonly statsService: QuoteStatsService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly quotePdfService: QuotePdfService,
    private readonly contractPdfService: ContractPdfService,
    private readonly documentGen: DocumentGenerationService,
  ) {}

  /**
   * Retrieves a comprehensive, paginated registry of all quotes in the system.
   *
   * @param page Current target page index
   * @param limit Maximum amount of records to retrieve per response
   * @returns A promise resolving to a paginated set of all quotes
   */
  @Get()
  @ApiOperation({
    summary: 'List all quotes (Admin)',
    description: 'Access the global repository of all client proposals and issued quotes.',
  })
  @ApiQuery({ name: 'page', required: false, example: '1', description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, example: '20', description: 'Results per page' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by client user ID' })
  @ApiQuery({
    name: 'status',
    required: false,
    example: 'inbox',
    description:
      'Filter by quote status, or use queue shortcuts: inbox (needs attention), all (no filter). Default excludes accepted/declined/expired.',
  })
  @ApiStandardResponse()
  async listQuotes(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ): Promise<any> {
    const { page: pageNum, limit: limitNum } = clampPagination(page, limit);
    return this.adminService.listQuotes(pageNum, limitNum, userId, status, sortBy, sortOrder);
  }

  /**
   * Retrieves system-wide quote activity metrics and analytics.
   *
   * @returns A promise resolving to a global statistical overview of all quotes
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get overall quote statistics',
    description:
      'Access administrative KPIs including total volume, conversion rates, and revenue trends.',
  })
  @ApiStandardResponse()
  async getStats(): Promise<any> {
    return this.statsService.getOverallStats();
  }

  /**
   * @deprecated Static full-quote templates are not supported (CODE-GAP-003 closed).
   * Use GET /admin/quotes/line-item-library and POST /admin/requests/:id/quotes/prefill.
   */
  @Get('templates')
  @ApiOperation({
    summary: 'List quote templates (deprecated)',
    deprecated: true,
    description:
      'Deprecated (CODE-GAP-003). Returns empty templates array plus line-item library blocks. ' +
      'Use GET /admin/quotes/line-item-library instead.',
  })
  @ApiStandardResponse()
  async getTemplates(): Promise<any> {
    const blocks = await this.lineItemLibrary.list(true);
    return {
      templates: [],
      lineItemLibrary: blocks,
      _meta: {
        deprecated: true,
        implemented: false,
        sunsetDate: '2026-12-31',
        replacements: [
          'GET /admin/quotes/line-item-library',
          'POST /admin/requests/:id/quotes/prefill',
          'GET /admin/projects/:id/duplicate-preview',
          'POST /admin/projects/from-template',
        ],
      },
    };
  }

  /**
   * @deprecated Static full-quote template save is not supported.
   */
  @Post('templates')
  @HttpCode(HttpStatus.GONE)
  @ApiOperation({
    summary: 'Create quote template (removed)',
    deprecated: true,
    description:
      'Removed (CODE-GAP-003). Use POST /admin/quotes/line-item-library for reusable blocks.',
  })
  async createQuoteTemplate(): Promise<any> {
    throw new GoneException({
      code: 'QUOTE_TEMPLATE_DEPRECATED',
      message:
        'Static quote templates are not supported. Use modular reuse: ' +
        'GET /admin/quotes/line-item-library, POST /admin/requests/:id/quotes/prefill, ' +
        'or POST /admin/projects/from-template.',
      replacements: [
        'GET /admin/quotes/line-item-library',
        'POST /admin/requests/:id/quotes/prefill',
        'POST /admin/projects/from-template',
      ],
    });
  }

  @Get('line-item-library')
  @ApiOperation({
    summary: 'List reusable quote line-item blocks',
    description: 'Modular building blocks for admin quote creation (not frozen full quotes).',
  })
  @ApiQuery({ name: 'includeInactive', required: false, example: 'false' })
  @ApiStandardResponse()
  async listLineItemLibrary(@Query('includeInactive') includeInactive?: string): Promise<any> {
    const blocks = await this.lineItemLibrary.list(includeInactive !== 'true');
    return { blocks };
  }

  @Post('line-item-library')
  @ApiOperation({ summary: 'Create a line-item library block' })
  @ApiStandardResponse({ message: 'Line-item block created' })
  async createLineItemBlock(
    @Body() dto: CreateLineItemBlockDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<any> {
    const block = await this.lineItemLibrary.create(dto);
    res.status(HttpStatus.CREATED);
    return block;
  }

  @Patch('line-item-library/:id')
  @ApiOperation({ summary: 'Update a line-item library block' })
  @ApiParam({ name: 'id', description: 'Block UUID' })
  @ApiStandardResponse({ message: 'Line-item block updated' })
  async updateLineItemBlock(
    @Param('id') id: string,
    @Body() dto: UpdateLineItemBlockDto,
  ): Promise<any> {
    return this.lineItemLibrary.update(id, dto);
  }

  @Delete('line-item-library/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a line-item library block' })
  @ApiParam({ name: 'id', description: 'Block UUID' })
  @ApiStandardResponse({ message: 'Line-item block deactivated' })
  async deactivateLineItemBlock(@Param('id') id: string): Promise<any> {
    return this.lineItemLibrary.deactivate(id);
  }

  /**
   * Lists built-in payment schedule presets (50/50, 30/70, etc.) for quote creation.
   */
  @Get('payment-schedule-presets')
  @ApiOperation({
    summary: 'List payment schedule presets',
    description: 'Built-in installment templates the admin can apply when creating a quote.',
  })
  @ApiStandardResponse()
  async listPaymentSchedulePresets(): Promise<any> {
    return { presets: this.adminService.listPaymentSchedulePresets() };
  }

  /**
   * Issues a new official quote to a client.
   * @deprecated Prefer POST /admin/requests/:id/quotes (canonical request-first path).
   */
  @Post()
  @ApiOperation({
    summary: 'Create and issue a new quote',
    deprecated: true,
    description:
      'Legacy path. Prefer POST /admin/requests/:id/quotes for request-first quoting with line items and tier discounts.',
  })
  @ApiStandardResponse({ message: 'Quote created successfully' })
  async createQuote(
    @ActiveUser('sub') adminId: string,
    @Body() dto: CreateQuoteAdminDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<any> {
    const result = await this.adminService.createQuote(adminId, dto);
    res.status(HttpStatus.CREATED);
    return result;
  }

  /**
   * Sends/Issues a finalized quote to the client via configured channels.
   */
  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send quote to client' })
  @ApiParam({ name: 'id', description: 'Quote UUID' })
  @ApiStandardResponse({ message: 'Quote sent successfully' })
  async sendQuote(@Param('id') id: string): Promise<any> {
    return this.adminService.sendQuote(id);
  }

  /**
   * Triggers a resend of the quote notification to the client.
   */
  @Post(':id/resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend quote notification' })
  @ApiParam({ name: 'id', description: 'Quote UUID' })
  @ApiStandardResponse({ message: 'Quote notification resent' })
  async resendQuote(@Param('id') id: string): Promise<any> {
    return this.adminService.resendQuote(id);
  }

  /**
   * Retrieves full administrative details for a specific quote.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get quote administrative details' })
  @ApiParam({ name: 'id', description: 'Quote UUID' })
  @ApiStandardResponse()
  async getQuoteDetails(@Param('id') id: string): Promise<any> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new BusinessLogicException('Quote not found', 'QUOTE_001');
    }
    const quote = await this.prismaRead.quote.findUnique({
      where: { id },
      include: { request: true, project: true },
    });
    if (!quote) {
      throw new BusinessLogicException('Quote not found', 'QUOTE_001');
    }
    // NL-BUG-QUOTE-001: admin detail previously omitted lineItems (raw Prisma row only).
    return {
      ...quote,
      lineItems: buildAdminQuoteLineItems(quote),
    };
  }

  /**
   * Updates an existing quote's details before or after issuance.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update quote details (Admin)' })
  @ApiParam({ name: 'id', description: 'Quote UUID' })
  @ApiStandardResponse({ message: 'Quote updated successfully' })
  async updateQuote(@Param('id') id: string, @Body() dto: UpdateQuoteAdminDto): Promise<any> {
    const existing = await this.prismaWrite.quote.findUnique({ where: { id } });
    if (!existing) {
      throw new BusinessLogicException('Quote not found', 'QUOTE_001');
    }

    const editableStatuses = ['DRAFT', 'PENDING', 'CHANGES_REQUESTED', 'REVISED'];
    if (!editableStatuses.includes(existing.status)) {
      throw new BusinessLogicException(
        'This quote cannot be edited in its current status. The client may need to request changes first, or the quote is already finalized.',
        'QUOTE_006',
      );
    }

    const data: Record<string, unknown> = { ...(dto as Record<string, unknown>) };
    delete data.items;
    delete data.requestId;
    delete data.validityDays;
    delete data.paymentBreakdown;
    delete data.schedulePreset;

    if (dto.items?.length) {
      const taxPct = dto.taxPercentage ?? existing.taxPercentage ?? 0;
      const totals = computeQuoteTotalsPaise(dto.items, taxPct);
      data.subtotal = totals.subtotal;
      data.taxPercentage = taxPct;
      data.taxAmount = totals.taxAmount;
      data.totalAmount = totals.totalAmount;
      data.paymentBreakdown = totals.paymentBreakdown;
    }

    if (dto.taxPercentage !== undefined && !dto.items?.length) {
      const subtotalPaise = existing.subtotal ?? 0;
      const taxAmountPaise = Math.round(subtotalPaise * (dto.taxPercentage / 100));
      data.taxPercentage = dto.taxPercentage;
      data.taxAmount = taxAmountPaise;
      data.totalAmount = subtotalPaise + taxAmountPaise;
    }

    const nextTotalPaise =
      typeof data.totalAmount === 'number' ? data.totalAmount : (existing.totalAmount ?? 0);

    if (Array.isArray((dto as any).paymentSchedule) && (dto as any).paymentSchedule.length) {
      data.paymentSchedule = normalizePaymentScheduleInput(
        (dto as any).paymentSchedule,
        nextTotalPaise,
        true,
      );
    } else if ((dto as any).schedulePreset) {
      data.paymentSchedule = buildPaymentScheduleFromPreset(
        (dto as any).schedulePreset as PaymentSchedulePresetId,
        nextTotalPaise,
      );
    } else if (dto.items?.length && Array.isArray(existing.paymentSchedule)) {
      // Recalculate amounts from existing percentage rows when line items change.
      const existingSchedule = existing.paymentSchedule as Array<{
        label?: string;
        percentage?: number;
        dueTrigger?: string;
        type?: string;
      }>;
      const hasPercentages = existingSchedule.every(
        (row) => typeof row.percentage === 'number' && (row.percentage ?? 0) > 0,
      );
      if (hasPercentages) {
        data.paymentSchedule = normalizePaymentScheduleInput(
          existingSchedule.map((row) => ({
            label: row.label ?? 'Payment',
            percentage: row.percentage,
            dueTrigger: row.dueTrigger as any,
            type: row.type as any,
          })),
          nextTotalPaise,
          true,
        );
      }
    }

    if (dto.termsAndConditions !== undefined) {
      data.termsAndConditions = dto.termsAndConditions;
    }
    if (dto.internalNotes !== undefined) {
      data.internalNotes = dto.internalNotes;
    }
    if (dto.requiresContract !== undefined) {
      data.requiresContract = dto.requiresContract;
    }
    if (dto.validUntil) {
      data.validUntil = new Date(dto.validUntil);
    }
    if (dto.currency) {
      data.currency = dto.currency;
    }

    if (existing.status === 'CHANGES_REQUESTED') {
      assertValidTransition('QUOTE', existing.status, 'REVISED');
      data.status = 'REVISED';
    }

    const updated = await this.prismaWrite.$transaction(async (tx: any) => {
      const q = await tx.quote.update({
        where: { id },
        data: data as any,
      });
      if (existing.status === 'CHANGES_REQUESTED') {
        await tx.projectRequest.update({
          where: { id: existing.requestId },
          data: { status: 'QUOTED' },
        });
      }
      return q;
    });
    return { quoteId: id, updated: true, data: updated };
  }

  /**
   * Permanent removal of a quote record.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete quote' })
  @ApiParam({ name: 'id', description: 'Quote UUID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: 204, description: 'Quote deleted' })
  async deleteQuote(@Param('id') id: string): Promise<any> {
    const existing = await this.prismaWrite.quote.findUnique({ where: { id } });
    if (!existing) {
      throw new BusinessLogicException('Quote not found', 'QUOTE_001');
    }

    await this.prismaWrite.quote.delete({ where: { id } });
    return { quoteId: id, deleted: true };
  }

  /**
   * Copies quote structure. With targetRequestId, creates quote on that request.
   * Without targetRequestId, clones as new DRAFT request (legacy).
   */
  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Duplicate quote',
    description:
      'Pass targetRequestId to copy onto an existing request. ' +
      'Without it, creates orphan DRAFT request (legacy — prefer POST /admin/requests/:id/quotes/prefill).',
  })
  @ApiParam({ name: 'id', description: 'Quote UUID' })
  @ApiStandardResponse({ message: 'Quote duplicated successfully' })
  async duplicateQuote(@Param('id') id: string, @Body() body: DuplicateQuoteDto): Promise<any> {
    const original = await this.prismaWrite.quote.findUnique({
      where: { id },
      include: { request: true },
    });
    if (!original) {
      throw new BusinessLogicException('Quote not found', 'QUOTE_001');
    }

    if (body.targetRequestId) {
      return this.duplicateOntoRequest(original as any, body.targetRequestId);
    }

    const src = original as any;

    const newRequest = await this.prismaWrite.projectRequest.create({
      data: {
        userId: original.request.userId,
        title: `Copy of ${original.request.title}`,
        description: original.request.description,
        category: original.request.category,
        status: 'DRAFT',
      },
    });

    const newQuote = await this.prismaWrite.quote.create({
      data: {
        requestId: newRequest.id,
        userId: original.userId,
        title: `Copy of ${original.title}`,
        description: original.description,
        subtotal: original.subtotal,
        taxPercentage: original.taxPercentage,
        taxAmount: original.taxAmount,
        totalAmount: original.totalAmount,
        currency: original.currency,
        validUntil: original.validUntil,
        status: 'DRAFT',
        terms: original.terms,
        notes: original.notes,
        paymentBreakdown: original.paymentBreakdown || {},
        paymentSchedule: src.paymentSchedule || {},
        timeline: original.timeline || {},
        scope: original.scope || {},
        technicalDetails: original.technicalDetails || {},
        requiresContract: src.requiresContract,
        revisionsIncluded: src.revisionsIncluded,
        additionalRevisionCost: src.additionalRevisionCost,
      } as any,
    });

    return {
      originalId: id,
      newQuoteId: newQuote.id,
      newRequestId: newRequest.id,
      _meta: {
        deprecated: true,
        note: 'Prefer POST /admin/requests/:targetRequestId/quotes/prefill with sourceQuoteId',
      },
    };
  }

  private async duplicateOntoRequest(original: any, targetRequestId: string) {
    const targetRequest = await this.prismaRead.projectRequest.findFirst({
      where: { id: targetRequestId, deletedAt: null },
    });
    if (!targetRequest) {
      throw new BusinessLogicException('Target request not found', 'REQUEST_001');
    }
    if (targetRequest.status === 'QUOTED') {
      throw new BusinessLogicException('Target request already has a quote', 'REQUEST_006');
    }

    const existingQuote = await this.prismaRead.quote.findUnique({
      where: { requestId: targetRequestId },
    });
    if (existingQuote) {
      throw new BusinessLogicException('Target request already has a quote', 'REQUEST_006');
    }

    const newQuote = await this.prismaWrite.$transaction(async (tx: any) => {
      const q = await tx.quote.create({
        data: {
          requestId: targetRequestId,
          userId: targetRequest.userId,
          title: targetRequest.title,
          description: targetRequest.description,
          subtotal: original.subtotal,
          taxPercentage: original.taxPercentage,
          taxAmount: original.taxAmount,
          totalAmount: original.totalAmount,
          currency: original.currency,
          validUntil: original.validUntil,
          status: 'DRAFT',
          terms: original.terms,
          termsAndConditions: original.termsAndConditions,
          notes: original.notes,
          internalNotes: original.internalNotes,
          paymentBreakdown: original.paymentBreakdown || {},
          paymentSchedule: original.paymentSchedule || {},
          timeline: original.timeline || {},
          scope: original.scope || {},
          technicalDetails: original.technicalDetails || {},
          requiresContract: original.requiresContract,
          revisionsIncluded: original.revisionsIncluded,
          additionalRevisionCost: original.additionalRevisionCost,
        } as any,
      });

      // NL-QUOTE-006: do not mark request QUOTED until admin Send (quote stays DRAFT).

      return q;
    });

    return {
      originalId: original.id,
      newQuoteId: newQuote.id,
      targetRequestId,
      status: 'draft',
    };
  }

  /**
   * Generates a new version (revision) based on an existing quote.
   */
  @Post(':id/revise')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create quote revision' })
  @ApiParam({ name: 'id', description: 'Quote UUID' })
  @ApiStandardResponse({ message: 'Quote revision created successfully' })
  async createRevision(@Param('id') id: string, @Body() dto: UpdateQuoteAdminDto): Promise<any> {
    const original = await this.prismaWrite.quote.findUnique({ where: { id } });
    if (!original) {
      throw new BusinessLogicException('Quote not found', 'QUOTE_001');
    }

    assertValidTransition('QUOTE', original.status, 'REVISED');

    const data: Record<string, unknown> = { ...(dto as Record<string, unknown>) };
    delete data.items;
    delete data.requestId;
    delete data.validityDays;
    delete data.paymentBreakdown;
    delete data.schedulePreset;

    if (dto.items?.length) {
      const taxPct = dto.taxPercentage ?? original.taxPercentage ?? 0;
      const totals = computeQuoteTotalsPaise(dto.items, taxPct);
      data.subtotal = totals.subtotal;
      data.taxPercentage = taxPct;
      data.taxAmount = totals.taxAmount;
      data.totalAmount = totals.totalAmount;
      data.paymentBreakdown = totals.paymentBreakdown;
    }

    if (dto.taxPercentage !== undefined && !dto.items?.length) {
      const subtotalPaise = original.subtotal ?? 0;
      const taxAmountPaise = Math.round(subtotalPaise * (dto.taxPercentage / 100));
      data.taxPercentage = dto.taxPercentage;
      data.taxAmount = taxAmountPaise;
      data.totalAmount = subtotalPaise + taxAmountPaise;
    }

    const nextTotalPaise =
      typeof data.totalAmount === 'number' ? data.totalAmount : (original.totalAmount ?? 0);

    if (Array.isArray((dto as any).paymentSchedule) && (dto as any).paymentSchedule.length) {
      data.paymentSchedule = normalizePaymentScheduleInput(
        (dto as any).paymentSchedule,
        nextTotalPaise,
        true,
      );
    } else if ((dto as any).schedulePreset) {
      data.paymentSchedule = buildPaymentScheduleFromPreset(
        (dto as any).schedulePreset as PaymentSchedulePresetId,
        nextTotalPaise,
      );
    } else if (dto.items?.length && Array.isArray(original.paymentSchedule)) {
      const existingSchedule = original.paymentSchedule as Array<{
        label?: string;
        percentage?: number;
        dueTrigger?: string;
        type?: string;
      }>;
      const hasPercentages = existingSchedule.every(
        (row) => typeof row.percentage === 'number' && (row.percentage ?? 0) > 0,
      );
      if (hasPercentages) {
        data.paymentSchedule = normalizePaymentScheduleInput(
          existingSchedule.map((row) => ({
            label: row.label ?? 'Payment',
            percentage: row.percentage,
            dueTrigger: row.dueTrigger as any,
            type: row.type as any,
          })),
          nextTotalPaise,
          true,
        );
      }
    }

    if (dto.termsAndConditions !== undefined) {
      data.termsAndConditions = dto.termsAndConditions;
    }
    if (dto.internalNotes !== undefined) {
      data.internalNotes = dto.internalNotes;
    }
    if (dto.requiresContract !== undefined) {
      data.requiresContract = dto.requiresContract;
    }
    if (dto.validUntil) {
      data.validUntil = new Date(dto.validUntil);
    }
    if (dto.currency) {
      data.currency = dto.currency;
    }

    data.status = 'REVISED';

    const updated = await this.prismaWrite.quote.update({
      where: { id },
      data: data as any,
    });

    await this.prismaWrite.outbox.create({
      data: {
        type: 'QUOTE_REVISION_CREATED',
        aggregateType: 'QUOTE',
        aggregateId: id,
        payload: { originalData: original, newData: updated },
      },
    });

    return { originalId: id, revisionId: id, data: updated };
  }

  /**
   * Retrieves the complete version and interaction history of a specific quote.
   */
  @Get(':id/history')
  @ApiOperation({ summary: 'Get quote history' })
  @ApiParam({ name: 'id', description: 'Quote UUID' })
  @ApiStandardResponse()
  async getHistory(@Param('id') id: string): Promise<any> {
    const quote = await this.prismaRead.quote.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        acceptedAt: true,
        declinedAt: true,
        expiredAt: true,
        userId: true,
      },
    });
    if (!quote) {
      throw new BusinessLogicException('Quote not found', 'QUOTE_001');
    }

    // NL-BUG-QUOTE-004 / QUOTE-002: include legacy outbox rows that only set payload.quoteId
    // (expiry writers historically omitted aggregateType/aggregateId).
    const rows = await this.prismaWrite.outbox.findMany({
      where: {
        type: {
          in: [
            'QUOTE_CREATED',
            'QUOTE_SENT',
            'QUOTE_VIEWED',
            'QUOTE_ACCEPTED',
            'QUOTE_DECLINED',
            'QUOTE_EXPIRED',
            'QUOTE_EXPIRING_SOON',
            'QUOTE_REVISION_CREATED',
            'QUOTE_REVISION_REQUESTED',
            'QUOTE_CHANGES_REQUESTED',
            'QUOTE_EXTENDED',
          ],
        },
        OR: [
          { aggregateType: 'QUOTE', aggregateId: id },
          { payload: { path: ['quoteId'], equals: id } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, type: true, payload: true, createdAt: true },
      take: 100,
    });

    const byType = new Set(rows.map((r) => r.type));
    const synthesised: Array<{
      id: string;
      type: string;
      payload: Record<string, unknown>;
      createdAt: Date;
    }> = [];

    // Always fill gaps from quote timestamps so a partial outbox trail still
    // shows the full lifecycle (do not return early when any row exists).
    if (!byType.has('QUOTE_CREATED')) {
      synthesised.push({
        id: `${id}:QUOTE_CREATED`,
        type: 'QUOTE_CREATED',
        payload: { quoteId: id, status: 'DRAFT', synthesised: true },
        createdAt: quote.createdAt,
      });
    }

    const status = String(quote.status).toUpperCase();
    if (
      !byType.has('QUOTE_SENT') &&
      ['SENT', 'VIEWED', 'ACCEPTED', 'DECLINED', 'EXPIRED'].includes(status)
    ) {
      synthesised.push({
        id: `${id}:QUOTE_SENT`,
        type: 'QUOTE_SENT',
        payload: { quoteId: id, userId: quote.userId, synthesised: true },
        createdAt: quote.updatedAt,
      });
    }
    if (
      !byType.has('QUOTE_VIEWED') &&
      ['VIEWED', 'ACCEPTED', 'DECLINED'].includes(status)
    ) {
      synthesised.push({
        id: `${id}:QUOTE_VIEWED`,
        type: 'QUOTE_VIEWED',
        payload: { quoteId: id, userId: quote.userId, synthesised: true },
        createdAt: quote.updatedAt,
      });
    }
    if (!byType.has('QUOTE_ACCEPTED') && status === 'ACCEPTED' && quote.acceptedAt) {
      synthesised.push({
        id: `${id}:QUOTE_ACCEPTED`,
        type: 'QUOTE_ACCEPTED',
        payload: { quoteId: id, userId: quote.userId, synthesised: true },
        createdAt: quote.acceptedAt,
      });
    }
    if (!byType.has('QUOTE_DECLINED') && status === 'DECLINED' && quote.declinedAt) {
      synthesised.push({
        id: `${id}:QUOTE_DECLINED`,
        type: 'QUOTE_DECLINED',
        payload: { quoteId: id, userId: quote.userId, synthesised: true },
        createdAt: quote.declinedAt,
      });
    }
    if (!byType.has('QUOTE_EXPIRED') && status === 'EXPIRED') {
      synthesised.push({
        id: `${id}:QUOTE_EXPIRED`,
        type: 'QUOTE_EXPIRED',
        payload: { quoteId: id, userId: quote.userId, synthesised: true },
        createdAt: quote.expiredAt ?? quote.updatedAt,
      });
    }

    const merged = collapseDuplicateQuoteHistory([...rows, ...synthesised]).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // Project-history Event shape (`at` / actorId / event) so UI + auditors count rows.
    const history = merged.map((row) => {
      const payload = (row.payload ?? {}) as Record<string, unknown>;
      return {
        id: row.id,
        type: row.type,
        event: row.type,
        label: QUOTE_HISTORY_LABELS[row.type] ?? row.type.replace(/^QUOTE_/, '').replace(/_/g, ' '),
        at: row.createdAt,
        createdAt: row.createdAt,
        from: payload.previousStatus ?? payload.oldStatus ?? null,
        to: payload.newStatus ?? payload.status ?? null,
        reason: payload.reason ?? null,
        actorId: payload.adminId ?? payload.userId ?? null,
        payload,
      };
    });

    return { quoteId: id, history, items: history };
  }

  @Get(':id/documents/versions')
  @ApiOperation({ summary: 'List quote document versions (admin)' })
  @ApiParam({ name: 'id', description: 'Quote UUID' })
  @ApiStandardResponse()
  async listDocumentVersions(@Param('id') id: string): Promise<any> {
    const quote = await this.prismaRead.quote.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!quote) {
      throw new BusinessLogicException('Quote not found', 'QUOTE_001');
    }
    const quoteDocs = await this.documentGen.listVersions('QUOTE', id, DocumentType.QUOTE);
    const contractDocs = await this.documentGen.listVersions('QUOTE', id, DocumentType.CONTRACT);
    const versions = [...quoteDocs, ...contractDocs].sort(
      (a, b) => b.versionNumber - a.versionNumber,
    );
    return { quoteId: id, versions, quotes: quoteDocs, contracts: contractDocs };
  }

  @Post(':id/extend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Extend quote validity' })
  @ApiParam({ name: 'id', description: 'Quote UUID' })
  async extendQuote(@Param('id') id: string, @Body() body: { extendDays?: number }): Promise<any> {
    const data = await this.adminService.extendQuote(id, body.extendDays ?? 14);
    return { status: 'success', data };
  }

  /**
   * Retrieves a metadata-rich link or status for the quote document (Admin view).
   * Pass `?regenerate=true` to force a new document version (NL-QUOTE-003).
   */
  @Get(':id/pdf')
  @ApiOperation({ summary: 'Get quote PDF metadata (Admin)' })
  @ApiParam({ name: 'id', description: 'Quote UUID' })
  @ApiQuery({
    name: 'regenerate',
    required: false,
    description: 'When true, always create a new PDF version',
  })
  @ApiStandardResponse()
  async getAdminPDF(
    @Param('id') id: string,
    @Query('regenerate') regenerate?: string,
  ): Promise<any> {
    const quote = await this.prismaWrite.quote.findUnique({
      where: { id },
      select: {
        id: true,
        quoteNumber: true,
        currentQuoteDocumentId: true,
        updatedAt: true,
      },
    });
    if (!quote) {
      throw new BusinessLogicException('Quote not found', 'QUOTE_001');
    }

    const wantRegen = regenerate === 'true' || regenerate === '1';
    // NL-BUG-QUOTE-007: do NOT compare quote.updatedAt to doc.createdAt.
    // generateAndStore writes currentQuoteDocumentId onto the quote, which bumps
    // updatedAt past the document timestamp and forced a full Puppeteer regen on
    // every subsequent admin download (8–25 s). Cache-hit by default; bump only
    // when explicitly regenerating or when no PDF exists yet (NL-QUOTE-003).
    const forceNewVersion = wantRegen || !quote.currentQuoteDocumentId;

    const doc = await this.quotePdfService.generateAndStore(
      id,
      wantRegen ? 'Admin PDF regenerate' : 'Admin PDF request',
      forceNewVersion,
    );

    return {
      quoteId: id,
      quoteNumber: quote.quoteNumber || doc.documentNumber,
      documentNumber: doc.documentNumber,
      version: doc.versionNumber,
      pdfUrl: doc.downloadUrl,
      expiresIn: 3600,
    };
  }

  @Get(':id/contract')
  @ApiOperation({ summary: 'Download signed contract PDF (Admin)' })
  @ApiParam({ name: 'id', description: 'Quote UUID' })
  @ApiStandardResponse()
  async getAdminContract(@Param('id') id: string): Promise<any> {
    return this.contractPdfService.getContractDownloadUrlAdmin(id);
  }
}

const TERMINAL_QUOTE_EVENTS = new Set(['QUOTE_ACCEPTED', 'QUOTE_DECLINED']);

const QUOTE_HISTORY_LABELS: Record<string, string> = {
  QUOTE_CREATED: 'Created',
  QUOTE_SENT: 'Sent',
  QUOTE_VIEWED: 'Viewed',
  QUOTE_ACCEPTED: 'Accepted',
  QUOTE_DECLINED: 'Declined',
  QUOTE_EXPIRED: 'Expired',
  QUOTE_EXPIRING_SOON: 'Expiring soon',
  QUOTE_REVISION_CREATED: 'Revision created',
  QUOTE_REVISION_REQUESTED: 'Revision requested',
  QUOTE_CHANGES_REQUESTED: 'Changes requested',
  QUOTE_EXTENDED: 'Extended',
};

/** Drop race-written duplicate terminal events and same-second bursts. */
function collapseDuplicateQuoteHistory<T extends { type: string; createdAt: Date }>(rows: T[]): T[] {
  const seenTerminal = new Set<string>();
  const seenBurst = new Set<string>();
  return rows.filter((row) => {
    if (TERMINAL_QUOTE_EVENTS.has(row.type)) {
      if (seenTerminal.has(row.type)) return false;
      seenTerminal.add(row.type);
      return true;
    }
    const second = Math.floor(new Date(row.createdAt).getTime() / 1000);
    const key = `${row.type}:${second}`;
    if (seenBurst.has(key)) return false;
    seenBurst.add(key);
    return true;
  });
}
