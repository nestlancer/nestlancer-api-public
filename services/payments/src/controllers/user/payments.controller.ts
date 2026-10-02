import { Controller, Post, Get, Body, Param, Query, HttpCode, BadRequestException, Headers } from '@nestjs/common';
import { ApiStandardResponses, Public } from '@nestlancer/common';
import { Auth, CurrentUser } from '@nestlancer/auth-lib';
import { PaymentsService } from '../../services/payments.service';
import { PaymentIntentService } from '../../services/payment-intent.service';
import { PaymentConfirmationService } from '../../services/payment-confirmation.service';
import { ReceiptPdfService } from '../../services/receipt-pdf.service';
import { InvoicePdfService } from '../../services/invoice-pdf.service';
import { PlatformPaymentAccountService } from '../../services/platform-payment-account.service';
import { BankTransferPaymentService } from '../../services/bank-transfer-payment.service';
import { CreatePaymentIntentDto } from '../../dto/create-payment-intent.dto';
import { ConfirmPaymentDto } from '../../dto/confirm-payment.dto';
import { QueryPaymentsDto } from '../../dto/query-payments.dto';
import { SubmitBankTransferDto } from '../../dto/bank-transfer.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

/**
 * Controller for managing user-facing payment operations.
 */
@ApiTags('Payments')
@ApiBearerAuth()
@Auth()
@Controller('payments')
@ApiStandardResponses()
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly intentService: PaymentIntentService,
    private readonly confirmationService: PaymentConfirmationService,
    private readonly receiptService: ReceiptPdfService,
    private readonly invoiceService: InvoicePdfService,
    private readonly platformAccounts: PlatformPaymentAccountService,
    private readonly bankTransferService: BankTransferPaymentService,
  ) {}

  @Public()
  @Get('health')
  @ApiOperation({
    summary: 'Payments service health check',
    description: 'Confirm that the payments microservice is reachable and operational.',
  })
  async health(): Promise<any> {
    return { status: 'ok', service: 'payments' };
  }

  @Get('platform-accounts')
  @ApiOperation({ summary: 'List active platform bank/UPI accounts for offline payment' })
  async listPlatformAccounts(): Promise<any> {
    const data = await this.platformAccounts.listActivePublic();
    return { status: 'success', data };
  }

  @Post('bank-transfer/submit')
  @ApiOperation({ summary: 'Submit offline bank/UPI transfer with receipt proof' })
  @ApiResponse({ status: 201, description: 'Transfer submitted for verification' })
  async submitBankTransfer(
    @CurrentUser('userId') userId: string,
    @Body() dto: SubmitBankTransferDto,
  ): Promise<any> {
    const data = await this.bankTransferService.submit(userId, dto);
    return { status: 'success', data };
  }

  @Post('create-intent')
  @ApiOperation({
    summary: 'Create a payment intent',
    description: 'Initialize a transaction with the payment provider to obtain a client secret.',
  })
  @ApiResponse({ status: 201, description: 'Payment intent created successfully' })
  async createIntent(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePaymentIntentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('x-idempotency-key') idempotencyKeyAlt?: string,
  ): Promise<any> {
    const data = await this.intentService.createIntent(
      userId,
      dto,
      idempotencyKey || idempotencyKeyAlt,
    );
    return { status: 'success', data };
  }

  @Post('initiate')
  @ApiOperation({ summary: 'Initiate a payment' })
  @ApiResponse({ status: 201, description: 'Payment initiation successful' })
  async initiatePayment(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePaymentIntentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('x-idempotency-key') idempotencyKeyAlt?: string,
  ): Promise<any> {
    const data = await this.intentService.createIntent(
      userId,
      dto,
      idempotencyKey || idempotencyKeyAlt,
    );
    return { status: 'success', data };
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Confirm a payment' })
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Payment confirmed successfully' })
  async confirmPayment(
    @CurrentUser('userId') userId: string,
    @Body() dto: ConfirmPaymentDto,
  ): Promise<any> {
    const data = await this.confirmationService.confirm(userId, dto);
    return { status: 'success', data };
  }

  @Get()
  @ApiOperation({ summary: 'List user payments' })
  @ApiResponse({ status: 200, description: 'Payments list retrieved successfully' })
  async getMyPayments(
    @CurrentUser('userId') userId: string,
    @Query() query: QueryPaymentsDto,
  ): Promise<any> {
    const data = await this.paymentsService.getMyPayments(userId, query);
    return { status: 'success', data };
  }

  @Get('projects/:projectId')
  @ApiOperation({ summary: 'Get project payments' })
  @ApiResponse({ status: 200, description: 'Project payments retrieved successfully' })
  async getProjectPayments(
    @CurrentUser('userId') userId: string,
    @Param('projectId') projectId: string,
  ): Promise<any> {
    const data = await this.paymentsService.getMyPayments(userId, {
      projectId,
    } as QueryPaymentsDto);
    return { status: 'success', data };
  }

  @Get('projects/:projectId/milestones')
  @ApiOperation({ summary: 'Get payment milestones for project' })
  @ApiResponse({ status: 200, description: 'Project milestones retrieved successfully' })
  async getProjectMilestones(
    @CurrentUser('userId') userId: string,
    @Param('projectId') projectId: string,
  ): Promise<any> {
    const data = await this.paymentsService.getProjectMilestones(userId, projectId);
    return { status: 'success', data };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user payment statistics' })
  @ApiResponse({ status: 200, description: 'Payment statistics retrieved successfully' })
  async getPaymentStats(@CurrentUser('userId') userId: string): Promise<any> {
    const data = await this.paymentsService.getUserPaymentStats(userId);
    return { status: 'success', data };
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Check payment status' })
  @ApiResponse({ status: 200, description: 'Payment status retrieved successfully' })
  async getPaymentStatus(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<any> {
    const payment = await this.paymentsService.getPaymentById(userId, id);
    return { status: 'success', data: { id: payment.id, status: (payment as any).status } };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment details' })
  @ApiResponse({ status: 200, description: 'Payment details retrieved successfully' })
  async getPaymentDetails(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<any> {
    const data = await this.paymentsService.getPaymentById(userId, id);
    return { status: 'success', data };
  }

  @Get(':id/receipt')
  @ApiOperation({ summary: 'Download payment receipt' })
  @ApiResponse({ status: 200, description: 'Receipt download URL generated' })
  async downloadReceipt(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<any> {
    await this.paymentsService.getPaymentById(userId, id);
    const url = await this.receiptService.generateReceipt(id);
    return { status: 'success', data: { url } };
  }

  @Get(':id/invoice')
  @ApiOperation({ summary: 'Download payment invoice' })
  @ApiResponse({ status: 200, description: 'Invoice download URL generated' })
  async downloadInvoice(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<any> {
    const payment = await this.paymentsService.getPaymentById(userId, id);
    // NL-PAY-009: do not issue invoices for installments that are not yet due.
    if (!this.paymentsService.isClientInvoiceVisible(payment)) {
      throw new BadRequestException(
        'Invoice is available when this installment is due for payment',
      );
    }
    const url = await this.invoiceService.generateInvoice(id);
    return { status: 'success', data: { url } };
  }

  @Post(':id/dispute')
  @ApiOperation({ summary: 'File a payment dispute' })
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Payment dispute filed successfully' })
  async fileDispute(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() body: { reason: string; description: string },
  ): Promise<any> {
    const data = await this.paymentsService.fileDispute(userId, id, body);
    return { status: 'success', data };
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a pending payment' })
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Payment cancelled successfully' })
  async cancelPayment(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<any> {
    const data = await this.paymentsService.cancelPayment(userId, id);
    return { status: 'success', data };
  }
}
