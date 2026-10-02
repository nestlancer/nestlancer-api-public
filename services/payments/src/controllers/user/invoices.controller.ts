import { Controller, Get, Param, Query, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiStandardResponses, sanitizeClientPaymentNotes } from '@nestlancer/common';
import { Auth, CurrentUser } from '@nestlancer/auth-lib';
import { PrismaReadService } from '@nestlancer/database';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { InvoicePdfService } from '../../services/invoice-pdf.service';
import { PaymentsService } from '../../services/payments.service';

/**
 * Controller for managing user invoices.
 * Invoices are shown when an installment is due or the payment is paid/in-flight.
 */
@ApiTags('Invoices')
@ApiBearerAuth()
@Auth()
@Controller('invoices')
@ApiStandardResponses()
export class InvoicesController {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly invoicePdfService: InvoicePdfService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * Retrieves a paginated registry of invoices issued to the authenticated user.
   */
  @Get()
  @ApiOperation({
    summary: 'List user invoices',
    description:
      'Access your global repository of financial invoices for billing and tax purposes.',
  })
  @ApiResponse({ status: 200, description: 'Invoices list retrieved successfully' })
  async listInvoices(
    @CurrentUser('userId') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ): Promise<any> {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      clientId: userId,
      invoiceNumber: { not: null },
    };

    // NL-PAY-010: load candidates, then keep only due/paid invoices (same rules as download).
    const candidates = await this.prismaRead.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        invoiceNumber: true,
        amount: true,
        currency: true,
        status: true,
        customNotes: true,
        createdAt: true,
        projectId: true,
        milestoneId: true,
        paymentRequestedAt: true,
        paidAt: true,
        dueDate: true,
        updatedAt: true,
        currentInvoiceDocumentId: true,
        project: { select: { id: true, title: true } },
        currentInvoiceDocument: {
          select: { documentNumber: true },
        },
      },
    });

    const annotated = await this.paymentsService.annotateClientPaymentsWithCanPay(
      userId,
      candidates,
    );
    const visible = annotated.filter((p) => this.paymentsService.isClientInvoiceVisible(p));
    const total = visible.length;
    const pageItems = visible.slice(skip, skip + limitNum);

    return {
      status: 'success',
      data: pageItems.map((p) => {
        const documentNumber =
          (p as any).currentInvoiceDocument?.documentNumber || p.invoiceNumber;
        return {
          id: p.id,
          invoiceNumber: documentNumber,
          documentNumber,
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          canPay: p.canPay,
          customNotes: sanitizeClientPaymentNotes(p.customNotes),
          issuedAt: p.createdAt,
          paidAt: p.status === 'COMPLETED' ? (p.paidAt ?? p.updatedAt) : p.paidAt,
          dueDate: p.dueDate ?? p.paymentRequestedAt,
          projectId: p.projectId,
          paymentId: p.id,
          projectTitle: p.project?.title ?? null,
          project: p.project,
        };
      }),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 0,
      },
    };
  }

  /**
   * Retrieves full details for a specific invoice.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get invoice details' })
  @ApiResponse({ status: 200, description: 'Invoice details retrieved successfully' })
  async getInvoice(@CurrentUser('userId') userId: string, @Param('id') id: string): Promise<any> {
    const payment = await this.paymentsService.getPaymentById(userId, id);
    if (!payment?.invoiceNumber) {
      throw new NotFoundException('Invoice not found');
    }
    if (!this.paymentsService.isClientInvoiceVisible(payment)) {
      throw new NotFoundException('Invoice not found');
    }

    return {
      status: 'success',
      data: {
        id: payment.id,
        invoiceNumber: payment.invoiceNumber,
        userId: payment.clientId,
        projectId: payment.projectId,
        projectTitle: payment.project?.title ?? null,
        project: payment.project,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        canPay: payment.canPay,
        customNotes: sanitizeClientPaymentNotes(payment.customNotes),
        invoiceUrl: payment.invoiceUrl,
        issuedAt: payment.createdAt,
        paidAt:
          payment.status === 'COMPLETED' ? (payment.paidAt ?? payment.updatedAt) : payment.paidAt,
        dueDate: payment.dueDate ?? payment.paymentRequestedAt,
        paymentId: payment.id,
      },
    };
  }

  /**
   * Generates and returns a download link for an invoice PDF.
   */
  @Get(':id/download')
  @ApiOperation({ summary: 'Download invoice PDF' })
  @ApiResponse({ status: 200, description: 'Invoice download URL generated' })
  async downloadInvoice(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<any> {
    const payment = await this.paymentsService.getPaymentById(userId, id);
    // NL-PAY-009/010: block not-due installment invoice downloads.
    if (!this.paymentsService.isClientInvoiceVisible(payment)) {
      throw new BadRequestException(
        'Invoice is available when this installment is due for payment',
      );
    }

    const result = await this.invoicePdfService.generateInvoice(id);

    return {
      status: 'success',
      data: {
        downloadUrl: result.url,
        documentNumber: result.documentNumber,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      },
    };
  }
}
