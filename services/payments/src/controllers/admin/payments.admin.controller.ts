import {
  BadRequestException,
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Auth, CurrentUser } from '@nestlancer/auth-lib';
import {
  ApiStandardResponse,
  ApiStandardResponses,
  BusinessLogicException,
  PAYMENT_GATE_ERROR,
  ParseUuidPipe,
  PaymentStatus,
  isValidAmount,
  resolveManualPaymentAmountPaise,
} from '@nestlancer/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { PaymentsService } from '../../services/payments.service';
import { PaymentMilestonesService } from '../../services/payment-milestones.service';
import { RefundService } from '../../services/refund.service';
import { ReceiptPdfService } from '../../services/receipt-pdf.service';
import { InvoicePdfService } from '../../services/invoice-pdf.service';
import { DocumentGenerationService } from '@nestlancer/documents';
import { DocumentType } from '@prisma/client';
import { PaymentStatsService } from '../../services/payment-stats.service';
import { PaymentReconciliationService } from '../../services/payment-reconciliation.service';
import { PaymentCompletionService } from '@nestlancer/common';
import { RazorpayService } from '../../services/razorpay.service';
import { ProcessRefundDto } from '../../dto/process-refund.dto';
import { QueryPaymentsDto } from '../../dto/query-payments.dto';
import { ApproveTransferDto, RejectTransferDto } from '../../dto/bank-transfer.dto';
import { CreateManualPaymentDto } from '../../dto/create-manual-payment.dto';
import { BankTransferPaymentService } from '../../services/bank-transfer-payment.service';
import { PlatformPaymentAccountService } from '../../services/platform-payment-account.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

/**
 * Controller for administrative payment management.
 */
@ApiTags('Admin/Payments')
@ApiBearerAuth()
@Auth('ADMIN')
@Controller('admin/payments')
@ApiStandardResponses()
export class PaymentsAdminController {
  private readonly logger = new Logger(PaymentsAdminController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly milestonesService: PaymentMilestonesService,
    private readonly refundService: RefundService,
    private readonly statsService: PaymentStatsService,
    private readonly reconciliationService: PaymentReconciliationService,
    private readonly receiptService: ReceiptPdfService,
    private readonly invoiceService: InvoicePdfService,
    private readonly documentGen: DocumentGenerationService,
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly paymentCompletion: PaymentCompletionService,
    private readonly razorpayService: RazorpayService,
    private readonly bankTransferService: BankTransferPaymentService,
    private readonly platformAccounts: PlatformPaymentAccountService,
  ) {}

  /**
   * Retrieves a global, paginated registry of all financial transactions within the platform.
   *
   * @param query Global filtering and pagination parameters
   * @returns A promise resolving to a paginated set of all system payments
   */
  @Get()
  @ApiOperation({
    summary: 'List all payments (Admin)',
    description:
      'Access the global repository of payment records for administrative audit and reconciliation.',
  })
  @ApiResponse({ status: 200, description: 'Payments list retrieved successfully' })
  async getPayments(@Query() query: QueryPaymentsDto): Promise<any> {
    const data = await this.paymentsService.getAdminPayments(query);
    return { status: 'success', ...data };
  }

  /**
   * Retrieves aggregated system-wide financial statistics and KPIs.
   *
   * @returns A promise resolving to a statistical overview of payment volume and statuses
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get payment statistics',
    description:
      'Monitor high-level transaction volume, success rates, and total volume platform-wide.',
  })
  @ApiStandardResponse(Object)
  async getStats(): Promise<any> {
    const data = await this.statsService.getStats();
    return { status: 'success', data };
  }

  /** Back-compat alias used by admin dashboards and external audits. */
  @Get('summary')
  @ApiOperation({ summary: 'Get payment summary (alias for stats)' })
  @ApiStandardResponse(Object)
  async getSummary(): Promise<any> {
    return this.getStats();
  }

  /**
   * Retrieves a read-only reconciliation report (payments with external IDs for audit).
   * Query params: startDate, endDate (ISO), page, limit.
   */
  @Get('reconciliation')
  @ApiOperation({ summary: 'Get payment reconciliation data' })
  @ApiStandardResponse(Object)
  async getReconciliation(
    @Query() query: { startDate?: string; endDate?: string; page?: string; limit?: string },
  ): Promise<any> {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    const page = query.page ? parseInt(query.page, 10) : undefined;
    const limit = query.limit ? parseInt(query.limit, 10) : undefined;
    const report = await this.reconciliationService.getReconciliationReport({
      startDate,
      endDate,
      page,
      limit,
    });
    return {
      status: 'success',
      data: report.items,
      summary: report.summary,
      pagination: report.pagination,
    };
  }

  /**
   * Lists all payment milestones, optionally filtered by project.
   */
  @Get('milestones')
  @ApiOperation({ summary: 'List all payment milestones' })
  @ApiStandardResponse(Object)
  async listMilestones(@Query('projectId') projectId?: string): Promise<any> {
    const data = await this.milestonesService.listMilestones(projectId);
    return { status: 'success', data };
  }

  /**
   * Retrieves details for a specific payment milestone.
   */
  @Get('milestones/:id')
  @ApiOperation({ summary: 'Get milestone details' })
  @ApiStandardResponse(Object)
  async getMilestone(@Param('id') id: string): Promise<any> {
    const data = await this.milestonesService.getMilestoneById(id);
    if (!data) return { status: 'success', data: null };
    return { status: 'success', data };
  }

  /**
   * Updates the payment-related fields of a milestone (amount, currency, dueDate, status).
   * The POST /admin/payments/projects/:projectId/milestones endpoint was removed — use
   * POST /admin/projects/:projectId/milestones (projects service) instead.
   */
  @Patch('milestones/:id')
  @ApiOperation({ summary: 'Update milestone payment fields' })
  @ApiStandardResponse(Object)
  async updateMilestone(@Param('id') id: string, @Body() body: any): Promise<any> {
    const updateData: any = {};
    if (body.amount !== undefined) updateData.amount = body.amount;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.dueDate !== undefined) updateData.dueDate = new Date(body.dueDate);
    if (body.status !== undefined) updateData.status = body.status;

    if (Object.keys(updateData).length === 0) {
      return { status: 'success', data: { id, message: 'No fields to update' } };
    }

    try {
      const updated = await this.prismaWrite.milestone.update({
        where: { id },
        data: updateData,
      });
      return { status: 'success', data: updated };
    } catch (err: any) {
      if (err?.code === 'P2025') {
        return { status: 'error', message: 'Milestone not found' };
      }
      throw err;
    }
  }

  /**
   * Generates a revenue report for a specified period and grouping.
   */
  @Get('revenue/report')
  @ApiOperation({ summary: 'Get revenue report' })
  @ApiStandardResponse(Object)
  async getRevenueReport(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('groupBy') groupBy: string = 'month',
  ): Promise<any> {
    // Keep disputed (captured) payments in revenue until refunded — NL-BUG-DISP-001.
    const where: any = { status: { in: ['COMPLETED', 'DISPUTED'] } };
    if (from || to) {
      where.paidAt = {};
      if (from) where.paidAt.gte = new Date(from);
      if (to) where.paidAt.lte = new Date(to);
    }

    const payments = await this.prismaRead.payment.findMany({
      where,
      select: { amount: true, currency: true, paidAt: true },
      orderBy: { paidAt: 'asc' },
    });

    // Group by period
    const breakdown = new Map<string, { period: string; revenue: number; count: number }>();
    for (const p of payments) {
      const date = p.paidAt || new Date();
      let key: string;
      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!breakdown.has(key)) breakdown.set(key, { period: key, revenue: 0, count: 0 });
      const entry = breakdown.get(key)!;
      entry.revenue += Number(p.amount);
      entry.count++;
    }

    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      status: 'success',
      data: {
        period: { from, to, groupBy },
        totalRevenue,
        totalTransactions: payments.length,
        breakdown: Array.from(breakdown.values()),
      },
    };
  }

  /**
   * Exports revenue data in the specified format (CSV/JSON).
   */
  @Get('revenue/export')
  @ApiOperation({ summary: 'Export revenue data' })
  @ApiStandardResponse(Object)
  async exportRevenue(
    @CurrentUser('sub') adminId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('format') format: string = 'csv',
  ): Promise<any> {
    const exportId = `export_${Date.now()}`;

    await this.prismaWrite.outbox.create({
      data: {
        type: 'REVENUE_EXPORT_REQUESTED',
        payload: { exportId, from, to, format, requestedByUserId: adminId },
      },
    });

    return {
      status: 'success',
      data: {
        exportId,
        status: 'processing',
        format,
      },
    };
  }

  /**
   * Lists invoice and receipt PDF versions for a payment (admin).
   */
  @Get(':id/documents/versions')
  @ApiOperation({ summary: 'List payment document versions (admin)' })
  @ApiStandardResponse(Object)
  async listDocumentVersions(@Param('id') id: string): Promise<any> {
    const payment = await this.prismaRead.payment.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!payment) {
      return { status: 'error', message: 'Payment not found' };
    }
    const invoices = await this.documentGen.listVersions('PAYMENT', id, DocumentType.INVOICE);
    const receipts = await this.documentGen.listVersions('PAYMENT', id, DocumentType.RECEIPT);
    const versions = [...invoices, ...receipts].sort((a, b) => b.versionNumber - a.versionNumber);
    return { status: 'success', data: { paymentId: id, versions, invoices, receipts } };
  }

  /**
   * Generates and returns a download URL for a payment receipt PDF.
   */
  @Get(':id/receipt')
  @ApiOperation({ summary: 'Download payment receipt PDF (admin)' })
  @ApiStandardResponse(Object)
  async downloadReceipt(@Param('id') id: string): Promise<any> {
    const payment = await this.prismaRead.payment.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!payment) {
      return { status: 'error', message: 'Payment not found' };
    }
    const result = await this.receiptService.generateReceipt(id);
    return {
      status: 'success',
      data: {
        paymentId: id,
        documentNumber: result.documentNumber,
        downloadUrl: result.url,
        pdfUrl: result.url,
        filename: result.filename,
        expiresIn: Number(process.env.S3_PRESIGNED_URL_EXPIRY || 900),
      },
    };
  }

  /**
   * Generates an invoice PDF download URL for administrative review.
   */
  @Get(':id/invoice')
  @ApiOperation({ summary: 'Download payment invoice PDF (admin)' })
  @ApiStandardResponse(Object)
  async downloadInvoice(@Param('id') id: string): Promise<any> {
    const payment = await this.prismaRead.payment.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!payment) {
      return { status: 'error', message: 'Payment not found' };
    }
    const result = await this.invoiceService.generateInvoice(id);
    return {
      status: 'success',
      data: {
        paymentId: id,
        documentNumber: result.documentNumber,
        downloadUrl: result.url,
        pdfUrl: result.url,
        filename: result.filename,
        expiresIn: Number(process.env.S3_PRESIGNED_URL_EXPIRY || 900),
      },
    };
  }

  /**
   * Retrieves full payment details for administrative review.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get payment details (Admin)' })
  @ApiStandardResponse(Object)
  async getPaymentDetails(@Param('id', ParseUuidPipe) id: string): Promise<any> {
    const payment = await this.prismaRead.payment.findUnique({
      where: { id },
      include: {
        refunds: true,
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, title: true } },
        milestone: { select: { id: true, name: true, status: true } },
        proofs: { select: { id: true, mediaId: true, uploadedById: true, createdAt: true } },
        platformAccount: true,
        verifiedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return {
      status: 'success',
      data: payment,
    };
  }

  /**
   * Processes a refund for a transaction.
   */
  @Post(':id/refund')
  @ApiOperation({ summary: 'Process a refund' })
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Refund processed successfully' })
  async processRefund(
    @Param('id') id: string,
    @CurrentUser('userId') adminId: string,
    @Body() dto: ProcessRefundDto,
  ): Promise<any> {
    const data = await this.refundService.processRefund(id, adminId, dto);
    return { status: 'success', data };
  }

  /**
   * Verifies a payment against the gateway (or confirms it is already completed).
   * Does not mark CREATED schedule rows as paid — use manual payment for offline funds.
   */
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a pending client payment intent (admin)' })
  @HttpCode(200)
  @ApiStandardResponse(Object)
  async cancelPayment(@Param('id') id: string): Promise<any> {
    const data = await this.paymentsService.cancelPaymentAsAdmin(id);
    return { status: 'success', data };
  }

  @Post(':id/verify')
  @ApiOperation({ summary: 'Verify a payment' })
  @HttpCode(200)
  @ApiStandardResponse(Object)
  async verifyPayment(
    @Param('id') id: string,
    @CurrentUser('userId') adminId: string,
    @Body() body: any,
  ): Promise<any> {
    const payment = await this.prismaRead.payment.findUnique({
      where: { id },
      include: {
        client: { select: { email: true, firstName: true, lastName: true } },
        project: { select: { title: true } },
      },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      throw new BusinessLogicException(
        'Payment is already completed',
        'PAYMENT_GATE_003',
        { alreadyCompleted: true, status: payment.status },
      );
    }

    if (!payment.externalId) {
      throw new BusinessLogicException(
        'No gateway transaction to verify. Wait for the client to complete checkout, or record an offline payment via Manual payment.',
        PAYMENT_GATE_ERROR.PAYMENT_NOT_VERIFIABLE,
      );
    }

    const providerPayment = await this.razorpayService.fetchPayment(payment.externalId);
    const providerStatus = String(providerPayment?.status ?? '').toLowerCase();

    if (providerStatus !== 'captured') {
      return {
        status: 'success',
        data: {
          id,
          verified: false,
          status: payment.status,
          providerStatus,
          verificationNote: body?.verificationNote,
          verifiedAt: new Date().toISOString(),
        },
      };
    }

    await this.prismaWrite.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.COMPLETED,
        externalStatus: providerStatus,
        paidAt: payment.paidAt ?? new Date(),
        method: payment.method ?? 'razorpay',
      },
    });

    await this.paymentCompletion.finalizeExistingPayment({
      paymentId: id,
      projectId: payment.projectId,
      milestoneId: payment.milestoneId,
      clientId: payment.clientId,
      amount: payment.amount,
      currency: payment.currency || 'INR',
      clientEmail: payment.client?.email,
      clientName: payment.client
        ? `${payment.client.firstName} ${payment.client.lastName}`
        : undefined,
      projectTitle: payment.project?.title,
      source: 'admin_verify',
      adminId,
    });

    return {
      status: 'success',
      data: {
        id,
        verified: true,
        status: PaymentStatus.COMPLETED,
        providerStatus,
        verificationNote: body?.verificationNote,
        verifiedAt: new Date().toISOString(),
      },
    };
  }

  @Post('projects/:projectId/reconcile-state')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reconcile milestone/progress state from completed payments' })
  async reconcileProjectPaymentState(@Param('projectId') projectId: string): Promise<any> {
    await this.paymentCompletion.reconcileProjectPaymentState(projectId);

    const completedPayments = await this.prismaRead.payment.findMany({
      where: { projectId, status: PaymentStatus.COMPLETED },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceUrl: true,
        receiptUrl: true,
      },
    });

    let documentsGenerated = 0;
    for (const payment of completedPayments) {
      try {
        if (!payment.invoiceNumber || !payment.invoiceUrl) {
          await this.invoiceService.generateInvoice(payment.id);
          documentsGenerated += 1;
        }
        if (!payment.receiptUrl) {
          await this.receiptService.generateReceipt(payment.id);
          documentsGenerated += 1;
        }
      } catch (err) {
        this.logger.warn(
          `Reconcile document generation failed for ${payment.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    return {
      status: 'success',
      data: { projectId, reconciled: true, documentsGenerated },
    };
  }

  /**
   * Manually creates a payment entry in the system.
   */
  @Post('manual')
  @ApiOperation({ summary: 'Create manual payment entry' })
  @ApiResponse({ status: 201, description: 'Manual payment created successfully' })
  async createManualPayment(
    @CurrentUser('userId') adminId: string,
    @Body() body: CreateManualPaymentDto,
  ): Promise<any> {
    const project = await this.prismaRead.project.findFirst({
      where: { id: body.projectId },
      select: { id: true, clientId: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const clientId = project.clientId;
    if (body.clientId && body.clientId !== clientId) {
      throw new BadRequestException('clientId does not match project owner');
    }

    // NL-BUG-PAY-002: never mint a second COMPLETED payment for the same milestone.
    const alreadyCompleted = await this.prismaWrite.payment.findFirst({
      where: {
        projectId: body.projectId,
        milestoneId: body.milestoneId,
        status: PaymentStatus.COMPLETED,
      },
      select: { id: true },
    });
    if (alreadyCompleted) {
      throw new BusinessLogicException(
        'This milestone is already paid',
        PAYMENT_GATE_ERROR.PAYMENT_ALREADY_COMPLETED,
      );
    }

    const existing = await this.prismaWrite.payment.findFirst({
      where: {
        projectId: body.projectId,
        milestoneId: body.milestoneId,
        status: { in: [PaymentStatus.CREATED, PaymentStatus.PENDING] },
      },
      orderBy: { createdAt: 'desc' },
    });

    const milestone = await this.prismaRead.milestone.findFirst({
      where: { id: body.milestoneId, projectId: body.projectId },
      select: { amount: true, name: true },
    });
    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    // NL-BUG-PAY-001 / NL-BUG-MS-002: never bill a zero-amount delivery / placeholder milestone.
    const scheduleAmount = milestone.amount ?? 0;
    const existingAmount =
      typeof existing?.amount === 'number' && existing.amount > 0 ? existing.amount : 0;
    if (scheduleAmount <= 0 && existingAmount <= 0) {
      throw new BusinessLogicException(
        'Cannot record a payment against a non-billable milestone (amount is zero). Use a payment-schedule installment.',
        PAYMENT_GATE_ERROR.INVALID_MILESTONE_AMOUNT,
      );
    }

    // NL-BUG-PAY-001: reject explicit non-positive amounts (DTO @IsPositive is primary;
    // this guards schedule fallback of 0 and any bypassed validation).
    if (
      body.amount !== undefined &&
      body.amount !== null &&
      !isValidAmount(Math.round(Number(body.amount)))
    ) {
      throw new BadRequestException('amount must be a positive integer (paise)');
    }

    let amountPaise = resolveManualPaymentAmountPaise({
      bodyAmount: body.amount,
      existingAmount: existing?.amount,
      milestoneAmount: scheduleAmount,
    });
    if (!isValidAmount(amountPaise)) {
      throw new BusinessLogicException(
        'Payment amount must be greater than zero',
        PAYMENT_GATE_ERROR.INVALID_MILESTONE_AMOUNT,
      );
    }

    // A short payment must not close a larger milestone (₹1,000 used to mark a ₹22,500
    // installment COMPLETED). Exact match only — including the ÷100 unit correction above.
    if (scheduleAmount > 0 && amountPaise !== scheduleAmount) {
      const bodyProvided = body.amount !== undefined && body.amount !== null;
      if (!bodyProvided) {
        amountPaise = scheduleAmount;
      } else {
        throw new BadRequestException(
          `Manual payment amount must equal the milestone amount (${scheduleAmount} paise)`,
        );
      }
    }

    const manualNotes = body.notes?.trim() || 'Recorded by support';
    const paidAt =
      body.paidAt && !Number.isNaN(Date.parse(body.paidAt))
        ? new Date(body.paidAt)
        : new Date();
    const payment = existing
      ? await this.prismaWrite.payment.update({
          where: { id: existing.id },
          data: {
            clientId,
            amount: amountPaise,
            currency: body.currency || existing.currency || 'INR',
            status: PaymentStatus.COMPLETED,
            method: 'manual',
            customNotes: manualNotes,
            verifiedById: adminId,
            verifiedAt: new Date(),
            invoiceNumber: body.invoiceNumber || existing.invoiceNumber || null,
            paidAt,
          },
        })
      : await this.prismaWrite.payment.create({
          data: {
            projectId: body.projectId,
            clientId,
            milestoneId: body.milestoneId,
            amount: amountPaise,
            currency: body.currency || 'INR',
            status: PaymentStatus.COMPLETED,
            method: 'manual',
            customNotes: manualNotes,
            verifiedById: adminId,
            verifiedAt: new Date(),
            invoiceNumber: body.invoiceNumber || null,
            paidAt,
          },
        });

    const relations = await this.prismaRead.payment.findUnique({
      where: { id: payment.id },
      include: {
        client: { select: { email: true, firstName: true, lastName: true } },
        project: { select: { title: true } },
      },
    });

    await this.paymentCompletion.finalizeExistingPayment({
      paymentId: payment.id,
      projectId: body.projectId,
      milestoneId: body.milestoneId,
      clientId: body.clientId,
      amount: payment.amount,
      currency: body.currency || payment.currency || 'INR',
      clientEmail: relations?.client.email,
      clientName: relations
        ? `${relations.client.firstName} ${relations.client.lastName}`
        : undefined,
      projectTitle: relations?.project.title,
      source: 'manual',
      adminId,
    });

    // Invoice/receipt PDFs are generated asynchronously by the document worker
    // (PAYMENT_COMPLETED / MANUAL_PAYMENT_CREATED outbox). Do not await sync PDF
    // generation here — it exceeds the payments gateway timeout and yields 504s.

    // Return the full payment row (plus createdBy) so clients reading data.id /
    // data.amount keep working after the sparse {paymentId, createdBy} regression.
    return {
      status: 'success',
      data: {
        ...(relations ?? payment),
        id: payment.id,
        paymentId: payment.id,
        createdBy: adminId,
      },
    };
  }

  /**
   * Audit/runbook alias for `POST /admin/payments/{id}/manual-payment`.
   * Resolves project/milestone from the payment row and marks it complete.
   */
  @Post(':id/manual-payment')
  @ApiOperation({ summary: 'Record manual payment by payment id (audit alias)' })
  @ApiResponse({ status: 200, description: 'Manual payment recorded' })
  async recordManualPaymentById(
    @Param('id') paymentId: string,
    @CurrentUser('userId') adminId: string,
    @Body() body: Record<string, unknown>,
  ): Promise<any> {
    const payment = await this.prismaRead.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, projectId: true, milestoneId: true, amount: true, currency: true, status: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (!payment.projectId || !payment.milestoneId) {
      return {
        status: 'error',
        message: 'Payment is missing projectId or milestoneId for manual recording',
      };
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      return {
        status: 'success',
        data: { paymentId: payment.id, alreadyCompleted: true },
      };
    }

    return this.createManualPayment(adminId, {
      projectId: payment.projectId,
      milestoneId: payment.milestoneId,
      amount: typeof body.amount === 'number' ? body.amount : payment.amount,
      currency: typeof body.currency === 'string' ? body.currency : payment.currency,
      notes: typeof body.notes === 'string' ? body.notes : undefined,
      invoiceNumber: typeof body.invoiceNumber === 'string' ? body.invoiceNumber : undefined,
    });
  }

  /**
   * Marks a **manual** (offline) payment as completed. Does not move delivery milestone status.
   * @deprecated Prefer Razorpay confirm/webhook for online payments.
   */
  @Post('milestones/:id/release')
  @ApiOperation({
    summary: 'Confirm manual milestone payment (offline)',
    deprecated: true,
    description:
      'For bank-transfer or manual entries only. Online Razorpay payments use confirm/webhook.',
  })
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Manual payment marked complete' })
  async releaseMilestonePayment(
    @Param('id') id: string,
    @CurrentUser('userId') adminId: string,
  ): Promise<any> {
    const milestone = await this.prismaRead.milestone.findUnique({
      where: { id },
    });

    if (!milestone) {
      return { status: 'error', message: 'Milestone not found' };
    }

    const payment = await this.prismaRead.payment.findFirst({
      where: {
        milestoneId: id,
        status: { in: ['CREATED', 'PENDING'] },
        method: 'manual',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      return {
        status: 'error',
        message:
          'No pending manual payment for this milestone. Use verify for Razorpay or create a manual payment first.',
      };
    }

    await this.prismaWrite.payment.update({
      where: { id: payment.id },
      data: { status: 'COMPLETED', paidAt: new Date() },
    });

    await this.paymentCompletion.finalizeExistingPayment({
      paymentId: payment.id,
      projectId: payment.projectId,
      milestoneId: id,
      clientId: payment.clientId,
      amount: payment.amount,
      currency: payment.currency,
      source: 'manual_release',
      adminId,
    });

    return {
      status: 'success',
      data: { milestoneId: id, paymentId: payment.id, released: true, releasedBy: adminId },
    };
  }

  /**
   * Retrieves individual transactions related to a specific payment.
   */
  @Get(':id/transactions')
  @ApiOperation({ summary: 'Get transaction history for a payment' })
  @ApiStandardResponse(Object)
  async getTransactionHistory(@Param('id', ParseUuidPipe) id: string): Promise<any> {
    const payment = await this.prismaRead.payment.findUnique({
      where: { id },
      select: { id: true, amount: true, status: true, paidAt: true, createdAt: true },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const refunds = await this.prismaRead.refund.findMany({
      where: { paymentId: id },
      orderBy: { createdAt: 'desc' },
    });

    const transactions = [
      { kind: 'payment' as const, ...payment },
      ...refunds.map((r) => ({ kind: 'refund' as const, ...r })),
    ];

    return {
      status: 'success',
      data: { paymentId: id, transactions },
    };
  }

  /**
   * Retrieves the audit timeline (events) for a specific payment.
   */
  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get payment timeline' })
  @ApiStandardResponse(Object)
  async getPaymentTimeline(@Param('id', ParseUuidPipe) id: string): Promise<any> {
    const payment = await this.prismaRead.payment.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const events = await this.prismaRead.auditLog.findMany({
      where: {
        resourceId: id,
        resourceType: { in: ['PAYMENT', 'payment'] },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        action: true,
        description: true,
        userId: true,
        createdAt: true,
      },
    });

    return {
      status: 'success',
      data: { paymentId: id, events },
    };
  }

  /**
   * Retrieves the list of currently supported payment methods.
   */
  @Get('methods/supported')
  @ApiOperation({ summary: 'Get supported payment methods' })
  @ApiStandardResponse(Object)
  async getSupportedMethods(): Promise<any> {
    const accounts = await this.platformAccounts.listActivePublic();
    const bankTransferEnabled = accounts.length > 0;
    return {
      status: 'success',
      data: {
        methods: [
          { id: 'razorpay', name: 'Razorpay', enabled: true },
          {
            id: 'bank_transfer',
            name: 'Bank Transfer / UPI',
            enabled: bankTransferEnabled,
          },
        ],
      },
    };
  }

  /**
   * Approves a client-submitted offline bank/UPI transfer.
   */
  @Post(':id/approve-transfer')
  @HttpCode(200)
  @ApiOperation({ summary: 'Approve offline bank/UPI transfer' })
  async approveTransfer(
    @Param('id') id: string,
    @CurrentUser('userId') adminId: string,
    @Body() dto: ApproveTransferDto,
  ): Promise<any> {
    const data = await this.bankTransferService.approve(adminId, id, dto || {});
    return { status: 'success', data };
  }

  /**
   * Rejects a client-submitted offline bank/UPI transfer.
   */
  @Post(':id/reject-transfer')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reject offline bank/UPI transfer' })
  async rejectTransfer(
    @Param('id') id: string,
    @CurrentUser('userId') adminId: string,
    @Body() dto: RejectTransferDto,
  ): Promise<any> {
    const data = await this.bankTransferService.reject(adminId, id, dto);
    return { status: 'success', data };
  }

  /**
   * Updates global payment configuration settings.
   */
  @Patch('settings')
  @ApiOperation({ summary: 'Update payment settings' })
  @ApiStandardResponse(Object)
  async updatePaymentSettings(@Body() body: any): Promise<any> {
    await this.prismaWrite.systemConfig.upsert({
      where: { key: 'payment.settings' },
      create: {
        key: 'payment.settings',
        value: body,
      },
      update: {
        value: body,
      },
    });

    return {
      status: 'success',
      message: 'Payment settings updated',
      data: body,
    };
  }
}
