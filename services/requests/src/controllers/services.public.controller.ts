import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public, ApiStandardResponses } from '@nestlancer/common';
import { Cacheable } from '@nestlancer/cache';
import { ServiceCatalogService } from '../services/service-catalog.service';

@ApiTags('Public/Services')
@Controller('services')
@Public()
@ApiStandardResponses()
export class ServicesPublicController {
  constructor(private readonly catalog: ServiceCatalogService) {}

  @Get()
  @Cacheable({ ttl: 300 })
  @ApiOperation({ summary: 'List active service packages' })
  async list() {
    const data = await this.catalog.listActive();
    return { status: 'success', data };
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get service package by slug' })
  async getOne(@Param('slug') slug: string) {
    const data = await this.catalog.getBySlug(slug);
    return { status: 'success', data };
  }
}
