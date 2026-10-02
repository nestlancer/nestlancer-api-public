import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth, CurrentUser } from '@nestlancer/auth-lib';
import { ApiStandardResponses } from '@nestlancer/common';
import { PlatformPaymentAccountService } from '../../services/platform-payment-account.service';
import {
  CreatePlatformPaymentAccountDto,
  UpdatePlatformPaymentAccountDto,
} from '../../dto/platform-payment-account.dto';

@ApiTags('Admin/Payment Accounts')
@ApiBearerAuth()
@Auth('ADMIN')
@Controller('admin/payments/accounts')
@ApiStandardResponses()
export class PlatformPaymentAccountsAdminController {
  constructor(private readonly accountsService: PlatformPaymentAccountService) {}

  @Get()
  @ApiOperation({ summary: 'List platform payment accounts (bank/UPI)' })
  async list() {
    const data = await this.accountsService.listAdmin();
    return { status: 'success', data };
  }

  @Post()
  @ApiOperation({ summary: 'Create a platform payment account' })
  async create(
    @CurrentUser('userId') adminId: string,
    @Body() dto: CreatePlatformPaymentAccountDto,
  ) {
    const data = await this.accountsService.create(adminId, dto);
    return { status: 'success', data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a platform payment account' })
  async update(
    @CurrentUser('userId') adminId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePlatformPaymentAccountDto,
  ) {
    const data = await this.accountsService.update(adminId, id, dto);
    return { status: 'success', data };
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Disable a platform payment account (soft delete)' })
  async remove(@CurrentUser('userId') adminId: string, @Param('id') id: string) {
    const data = await this.accountsService.softDelete(adminId, id);
    return { status: 'success', data };
  }
}
