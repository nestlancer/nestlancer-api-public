import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiStandardResponses } from '@nestlancer/common';
import { HttpProxyService } from '../../proxy';

@Controller('invoices')
@ApiTags('invoices')
@ApiBearerAuth()
@ApiStandardResponses()
export class InvoicesController {
  constructor(private readonly proxy: HttpProxyService) {}

  @Get()
  @ApiOperation({ summary: 'List user invoices' })
  async listInvoices(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice details' })
  @ApiParam({ name: 'id', description: 'Invoice / payment UUID' })
  async getInvoice(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download invoice PDF (presigned cloud URL)' })
  @ApiParam({ name: 'id', description: 'Invoice / payment UUID' })
  async downloadInvoice(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }
}
