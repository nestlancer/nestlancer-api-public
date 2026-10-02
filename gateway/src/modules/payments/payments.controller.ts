import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { Request } from 'express';

import { Public, ApiStandardResponses } from '@nestlancer/common';
import { HttpProxyService } from '../../proxy';

/**
 * Payments Gateway Controller
 * Routes payment requests to the Payments Service
 */
@Controller('payments')
@ApiTags('payments')
@ApiBearerAuth()
@ApiStandardResponses()
export class PaymentsController {
  constructor(private readonly proxy: HttpProxyService) {}

  // --- Payment Intents ---

  @Post('create-intent')
  @ApiOperation({ summary: 'Create a payment intent' })
  async createIntent(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Post('initiate')
  @ApiOperation({ summary: 'Initiate payment' })
  async initiate(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Confirm a payment' })
  async confirmPayment(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Get('platform-accounts')
  @ApiOperation({ summary: 'List active platform bank/UPI accounts' })
  async listPlatformAccounts(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Post('bank-transfer/submit')
  @ApiOperation({ summary: 'Submit offline bank/UPI transfer with proof' })
  async submitBankTransfer(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  // --- User Payments ---

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Payments service health check' })
  async health(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Get()
  @ApiOperation({ summary: 'List user payments' })
  async getMyPayments(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Get('stats')
  @ApiOperation({ summary: 'User payment statistics' })
  async getPaymentStats(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Get('projects/:projectId')
  @ApiOperation({ summary: 'Get project payments' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async getProjectPayments(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Get('projects/:projectId/milestones')
  @ApiOperation({ summary: 'Get payment milestones' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async getProjectMilestones(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Get('methods')
  @ApiOperation({ summary: 'List saved payment methods' })
  async getPaymentMethods(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Check payment status' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async getPaymentStatus(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment details' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async getPaymentDetails(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Get(':id/documents/versions')
  @ApiOperation({ summary: 'List payment document versions (invoices & receipts)' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  async listDocumentVersions(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Get(':id/receipt')
  @ApiOperation({ summary: 'Download payment receipt' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async downloadReceipt(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Get(':id/invoice')
  @ApiOperation({ summary: 'Download payment invoice' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async downloadInvoice(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Post(':id/dispute')
  @ApiOperation({ summary: 'File a payment dispute' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async fileDispute(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel pending payment' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async cancelPayment(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Post('methods')
  @ApiOperation({ summary: 'Save payment method' })
  async savePaymentMethod(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Delete('methods/:id')
  @ApiOperation({ summary: 'Remove payment method' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async removePaymentMethod(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Patch('methods/:id/default')
  @ApiOperation({ summary: 'Set a payment method as default' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async setDefaultPaymentMethod(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Patch('methods/:id/nickname')
  @ApiOperation({ summary: 'Update payment method nickname' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async updatePaymentMethodNickname(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }
}
