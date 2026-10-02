import { Controller, Get, Param, Res, HttpStatus, HttpException, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Response } from 'express';

import {
  API_PREFIX,
  API_VERSION,
  Public,
  SWAGGER_GATEWAY_SPEC_PATH,
  SWAGGER_MERGED_SPEC_PATH,
} from '@nestlancer/common';

import { DocsSpecsService } from './docs-specs.service';
import { getSwaggerDocsUrl, SWAGGER_SERVICE_SPECS } from './swagger.config';
import { isServiceRegistered } from '../proxy/service-registry';
import { SwaggerEnabledGuard } from './swagger-enabled.guard';

/**
 * Proxies OpenAPI (docs-json) specs from each microservice.
 * Used by Swagger UI's dropdown to load per-service documentation.
 */
@ApiTags('documentation')
@UseGuards(SwaggerEnabledGuard)
@Controller('docs-specs')
export class DocsSpecsController {
  constructor(private readonly docsSpecsService: DocsSpecsService) {}

  @Get()
  @ApiOperation({
    summary: 'List available OpenAPI specs',
    description:
      'Returns Swagger UI URL and per-microservice spec URLs. Use GET /docs-specs/all for the combined JSON.',
  })
  listSpecs() {
    const gatewayBase = `/${API_PREFIX}/${API_VERSION}`;
    return {
      swaggerUi: '/docs/',
      gatewaySpec: SWAGGER_GATEWAY_SPEC_PATH,
      mergedSpec: `${gatewayBase}/docs-specs/all`,
      mergedSpecShort: SWAGGER_MERGED_SPEC_PATH,
      services: SWAGGER_SERVICE_SPECS.map((spec) => ({
        name: spec.name,
        serviceKey: spec.serviceKey,
        specUrl: getSwaggerDocsUrl(spec.serviceKey, gatewayBase),
      })),
    };
  }

  @Get('all')
  @ApiOperation({
    summary: 'Combined OpenAPI spec (gateway + microservices)',
    description:
      'Single JSON document merging gateway-facing routes and per-microservice OpenAPI specs. No authentication required.',
  })
  async getAllSpecs(@Res() res: Response): Promise<void> {
    const document = await this.docsSpecsService.getMergedOpenApiDocument();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json(document);
  }

  @Get(':serviceKey')
  @ApiOperation({
    summary: 'OpenAPI spec for a microservice',
    description: 'Public proxy used by Swagger UI dropdown. Does not require authentication.',
  })
  async getSpec(@Param('serviceKey') serviceKey: string, @Res() res: Response): Promise<void> {
    const spec = SWAGGER_SERVICE_SPECS.find((s) => s.serviceKey === serviceKey);

    if (!spec || !isServiceRegistered(serviceKey)) {
      throw new HttpException(
        { status: 'error', message: `Unknown service: ${serviceKey}` },
        HttpStatus.NOT_FOUND,
      );
    }

    const data = await this.docsSpecsService.fetchServiceSpec(serviceKey);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json(data);
  }
}
