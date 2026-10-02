import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import {
  API_PREFIX,
  API_VERSION,
  isPublicDocumentationPath,
  isSwaggerEnabled,
  SWAGGER_GATEWAY_SPEC_PATH,
  SWAGGER_MERGED_SPEC_PATH,
} from '@nestlancer/common';

import { DocsSpecsService } from './docs-specs.service';
import {
  createGatewayProxyOpenApiDocument,
  registerGatewayProxyOpenApiDocument,
} from './gateway-openapi';
import { getServiceSpecsForSwaggerUi } from './swagger.config';
import { SwaggerDocsModule } from './swagger.module';
import { HealthModule } from '../modules/health/health.module';

import type { Request, Response } from 'express';

function registerSwaggerDisabledHandlers(app: INestApplication): void {
  const httpAdapter = app.getHttpAdapter();
  const notFound = (_req: Request, res: Response) => {
    res.status(404).json({ status: 'error', message: 'Not Found' });
  };
  for (const path of [
    '/docs',
    '/docs/',
    '/docs-all-json',
    '/docs-gateway-json',
    SWAGGER_MERGED_SPEC_PATH,
    SWAGGER_GATEWAY_SPEC_PATH,
  ]) {
    httpAdapter.get(path, notFound);
  }
}

/**
 * Registers Swagger UI, gateway OpenAPI JSON, and per-service docs-specs proxy.
 * Skipped when SWAGGER_ENABLED=false (default in production).
 */
export function setupSwagger(app: INestApplication): void {
  if (!isSwaggerEnabled()) {
    console.log('📚 Swagger disabled (SWAGGER_ENABLED=false or NODE_ENV=production)');
    registerSwaggerDisabledHandlers(app);
    return;
  }

  const gatewayBase = `/${API_PREFIX}/${API_VERSION}`;
  const specUrls = getServiceSpecsForSwaggerUi(gatewayBase);

  const gatewayOnlyConfig = new DocumentBuilder()
    .setTitle('Nestlancer Gateway')
    .setDescription('Gateway-specific endpoints: health checks and API documentation specs')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();

  const gatewayDocument = SwaggerModule.createDocument(app as any, gatewayOnlyConfig, {
    include: [HealthModule, SwaggerDocsModule],
  });

  const gatewayProxyDocument = createGatewayProxyOpenApiDocument(app);
  registerGatewayProxyOpenApiDocument(gatewayProxyDocument);

  const httpAdapter = app.getHttpAdapter();

  httpAdapter.get(SWAGGER_GATEWAY_SPEC_PATH, (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json(gatewayDocument);
  });

  const primaryName = specUrls[0]?.name ?? 'Gateway';
  const urlsJson = JSON.stringify(specUrls);

  // Custom index must register before SwaggerModule.setup (Express first-match).
  // Uses urls-only SwaggerUIBundle so the microservice selector is visible.
  httpAdapter.get('/docs/', (_req: Request, res: Response) => {
    res.type('text/html');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Nestlancer API – Microservices Docs</title>
  <link rel="stylesheet" type="text/css" href="/docs/swagger-ui.css">
  <link rel="icon" type="image/png" href="/docs/favicon-32x32.png" sizes="32x32">
  <link rel="icon" type="image/png" href="/docs/favicon-16x16.png" sizes="16x16">
  <style>html{box-sizing:border-box;overflow-y:scroll}*,*:before,*:after{box-sizing:inherit}body{margin:0;background:#fafafa}</style>
</head>
<body>
<div id="swagger-ui"></div>
<script src="/docs/swagger-ui-bundle.js"></script>
<script src="/docs/swagger-ui-standalone-preset.js"></script>
<script>
window.onload=function(){SwaggerUIBundle({urls:${urlsJson},"urls.primaryName":"${primaryName}",dom_id:"#swagger-ui",deepLinking:true,presets:[SwaggerUIBundle.presets.apis,SwaggerUIStandalonePreset],layout:"StandaloneLayout"})};
</script>
</body>
</html>`);
  });

  httpAdapter.get('/docs', (_req: Request, res: Response) => {
    res.redirect(301, '/docs/');
  });

  // Common mistaken URL — specs live under /api/v1/docs-specs/:service; UI is at /docs/
  httpAdapter.get('/docs-specs', (_req: Request, res: Response) => {
    res.redirect(301, '/docs/');
  });
  httpAdapter.get('/docs-specs/', (_req: Request, res: Response) => {
    res.redirect(301, '/docs/');
  });

  const docsSpecsService = app.get(DocsSpecsService);
  httpAdapter.get(SWAGGER_MERGED_SPEC_PATH, async (_req: Request, res: Response) => {
    try {
      const document = await docsSpecsService.getMergedOpenApiDocument();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.json(document);
    } catch {
      res.status(500).json({
        status: 'error',
        message: 'Failed to build merged OpenAPI document',
      });
    }
  });

  // Single Swagger UI mount (multi-service dropdown via swaggerOptions.urls).
  // explorer: true is required — NestJS hides .download-url-wrapper by default.
  SwaggerModule.setup('docs', app as any, gatewayDocument, {
    customSiteTitle: 'Nestlancer API – Microservices Docs',
    explorer: true,
    jsonDocumentUrl: SWAGGER_GATEWAY_SPEC_PATH.replace(/^\//, ''),
    swaggerOptions: {
      urls: specUrls,
      'urls.primaryName': primaryName,
    },
  });
}

/** Helmet bypass + cache headers for Swagger assets. */
export function isSwaggerRequest(path: string): boolean {
  return isPublicDocumentationPath(path);
}
