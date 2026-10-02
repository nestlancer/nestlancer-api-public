import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth, CurrentUser } from '@nestlancer/auth-lib';
import { ApiStandardResponses } from '@nestlancer/common';
import { CompanyLegalProfileService } from '../../services/company-legal-profile.service';
import {
  CreateCompanyLegalProfileDto,
  UpdateCompanyLegalProfileDto,
} from '../../dto/company-legal-profile.dto';

@ApiTags('Admin/Company Legal Profile')
@ApiBearerAuth()
@Auth('ADMIN')
@Controller('admin/payments/company-legal')
@ApiStandardResponses()
export class CompanyLegalProfileAdminController {
  constructor(private readonly profilesService: CompanyLegalProfileService) {}

  @Get()
  @ApiOperation({ summary: 'List company legal profiles (GSTIN/PAN/address for PDFs)' })
  async list() {
    const data = await this.profilesService.listAdmin();
    return { status: 'success', data };
  }

  @Post()
  @ApiOperation({ summary: 'Create a company legal profile' })
  async create(
    @CurrentUser('userId') adminId: string,
    @Body() dto: CreateCompanyLegalProfileDto,
  ) {
    const data = await this.profilesService.create(adminId, dto);
    return { status: 'success', data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a company legal profile' })
  async update(
    @CurrentUser('userId') adminId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyLegalProfileDto,
  ) {
    const data = await this.profilesService.update(adminId, id, dto);
    return { status: 'success', data };
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Remove a company legal profile' })
  async remove(@CurrentUser('userId') adminId: string, @Param('id') id: string) {
    const data = await this.profilesService.remove(adminId, id);
    return { status: 'success', data };
  }
}
