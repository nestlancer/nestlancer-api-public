import { NestFactory } from '@nestjs/core';

import compression from 'compression';
import helmet from 'helmet';

import {
  AppValidationPipe,
  AllExceptionsFilter,
  TransformResponseInterceptor,
  TimeoutInterceptor,
  API_PREFIX,
  API_VERSION,
  DEFAULT_GATEWAY_PORT,
} from '@nestlancer/common';
import { getCorsConfig, getHelmetConfig } from '@nestlancer/middleware';
import { bootstrapMetrics } from '@nestlancer/metrics';
import { initTracing } from '@nestlancer/tracing';

import { AppModule } from './app.module';
import { isSwaggerRequest, setupSwagger } from './swagger/swagger.setup';

import type { Request, Response, NextFunction } from 'express';
import { installJsonConsoleLogger } from '@nestlancer/logger';

/**
 * Bootstrap the Nestlancer API Gateway
 */
async function bootstrap() {
  installJsonConsoleLogger();

  await initTracing(process.env.OTEL_SERVICE_NAME || 'nl-gateway');

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    bodyParser: true,
    rawBody: true,
  });

  app
    .getHttpAdapter()
    .getInstance()
    .set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || '1') || 1);

  app.use(compression());
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      'Permissions-Policy',
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
    );
    next();
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (isSwaggerRequest(req.path)) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      return next();
    }
    helmet(getHelmetConfig())(req, res, next);
  });

  const corsOrigins =
    process.env.CORS_ORIGINS?.split(',')
      .map((o) => o.trim())
      .filter(Boolean) ?? [];
  app.enableCors(getCorsConfig(corsOrigins.length ? corsOrigins : ['http://localhost:3000']));

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return next();
    const path = req.path ?? '';
    if (path.includes('/webhooks/')) return next();
    const contentType = req.headers['content-type'];
    if (typeof contentType === 'string' && contentType.toLowerCase().includes('multipart/form-data')) {
      return next();
    }
    const length = Number(req.headers['content-length'] || 0);
    if (!contentType && length === 0) return next();
    const mediaType =
      typeof contentType === 'string' ? contentType.split(';')[0].trim().toLowerCase() : '';
    if (mediaType === 'application/json') return next();
    res.status(415).json({
      status: 'error',
      error: {
        code: 'PAYLOAD_PARSE_ERROR',
        message: 'Expected application/json',
        timestamp: new Date().toISOString(),
        path: req.originalUrl || req.url,
      },
    });
  });

  app.setGlobalPrefix(`${API_PREFIX}/${API_VERSION}`);

  app.useGlobalPipes(new AppValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new TransformResponseInterceptor(),
    new TimeoutInterceptor(),
  );

  setupSwagger(app);

  app.enableShutdownHooks();

  const port = process.env.GATEWAY_PORT || DEFAULT_GATEWAY_PORT;
  await app.listen(port);
  bootstrapMetrics(app);

  console.log(`🚀 Nestlancer API Gateway running on http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/docs`);
  console.log(`🔒 API Base URL: http://localhost:${port}/${API_PREFIX}/${API_VERSION}`);
}

bootstrap();
