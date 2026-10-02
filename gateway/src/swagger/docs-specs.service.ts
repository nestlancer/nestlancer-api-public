import { Injectable, Logger } from '@nestjs/common';

import { getRegisteredGatewayProxyOpenApiDocument } from './gateway-openapi';
import { mergeOpenApiSpecs, OpenApiDocument, OpenApiSpecSource } from './merge-openapi';
import { SWAGGER_SERVICE_SPECS } from './swagger.config';
import { HttpProxyService } from '../proxy/http-proxy.service';
import { isServiceRegistered } from '../proxy/service-registry';

function fallbackSpec(serviceName: string): OpenApiDocument {
  return {
    openapi: '3.0.0',
    info: { title: `${serviceName} Service`, version: '1.0' },
    paths: {},
  };
}

@Injectable()
export class DocsSpecsService {
  private readonly logger = new Logger(DocsSpecsService.name);

  constructor(private readonly httpProxy: HttpProxyService) {}

  async fetchServiceSpec(serviceKey: string): Promise<OpenApiDocument> {
    const spec = SWAGGER_SERVICE_SPECS.find((s) => s.serviceKey === serviceKey);
    if (!spec) {
      throw new Error(`Unknown service: ${serviceKey}`);
    }

    try {
      return (await this.httpProxy.request(
        serviceKey,
        'GET',
        spec.docsJsonPath,
      )) as OpenApiDocument;
    } catch {
      return fallbackSpec(spec.name);
    }
  }

  async fetchAllServiceSpecs(): Promise<OpenApiSpecSource[]> {
    const registered = SWAGGER_SERVICE_SPECS.filter((s) => isServiceRegistered(s.serviceKey));

    const results = await Promise.all(
      registered.map(async (spec) => ({
        name: spec.name,
        serviceKey: spec.serviceKey,
        document: await this.fetchServiceSpec(spec.serviceKey),
      })),
    );

    return results;
  }

  async getMergedOpenApiDocument(): Promise<OpenApiDocument> {
    const microserviceSources = await this.fetchAllServiceSpecs();
    const gatewayProxy = getRegisteredGatewayProxyOpenApiDocument();
    // Microservices first so detailed requestBody/response schemas win over gateway proxy stubs
    // on the same path (e.g. POST /api/v1/auth/login). Gateway second fills canonical-only routes
    // (e.g. /api/v1/blog/posts) after microservice path exclusions.
    const sources: OpenApiSpecSource[] = gatewayProxy
      ? [
          ...microserviceSources,
          { name: 'Gateway (public routes)', serviceKey: 'gateway', document: gatewayProxy },
        ]
      : microserviceSources;
    const { document, duplicatePaths } = mergeOpenApiSpecs(sources);
    for (const dup of duplicatePaths) {
      const method = dup.method ? ` ${String(dup.method).toUpperCase()}` : '';
      this.logger.warn(
        `OpenAPI merge skipped duplicate path${method} ${dup.path} from ${dup.skippedFrom} (kept ${dup.keptFrom})`,
      );
    }
    return document;
  }
}
