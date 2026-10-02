import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiStandardResponses, UserRole } from '@nestlancer/common';
import { JwtAuthGuard, Roles, RolesGuard } from '@nestlancer/auth-lib';
import { ServiceCatalogService } from '../services/service-catalog.service';
import { UpsertServicePackageDto } from '../dto/upsert-service-package.dto';

/**
 * Admin CRUD for the public service catalog (ServicePackage).
 * POST is idempotent upsert-by-slug for prod-data seeding.
 */
@ApiTags('Admin/Service Packages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/service-packages')
@ApiStandardResponses()
export class ServicePackagesAdminController {
  constructor(private readonly catalog: ServiceCatalogService) {}

  @Get()
  @ApiOperation({ summary: 'List all service packages (including inactive)' })
  async list() {
    const data = await this.catalog.listAll();
    return { status: 'success', data };
  }

  @Post()
  @ApiOperation({
    summary: 'Create or upsert service package',
    description: 'Upserts by unique slug. Safe for repeated seed runs.',
  })
  async upsert(@Body() dto: UpsertServicePackageDto) {
    const data = await this.catalog.upsert(dto);
    return { status: 'success', data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update service package by id' })
  @ApiParam({ name: 'id', description: 'Package UUID' })
  async update(@Param('id') id: string, @Body() dto: Partial<UpsertServicePackageDto>) {
    const data = await this.catalog.update(id, dto);
    return { status: 'success', data };
  }
}
