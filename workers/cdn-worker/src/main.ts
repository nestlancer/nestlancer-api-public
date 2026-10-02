import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { bootstrapMetrics } from '@nestlancer/metrics';
import { initTracing } from '@nestlancer/tracing';

import { AppModule } from './app.module';
import { installJsonConsoleLogger, LoggerService } from '@nestlancer/logger';

async function bootstrap() {
  installJsonConsoleLogger();

  await initTracing(process.env.OTEL_SERVICE_NAME || 'nl-worker-cdn');
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    app.useLogger(app.get(LoggerService));
  } catch {
    // LoggerModule missing
  }

  bootstrapMetrics(app);

  // The consumers are providers that use onModuleInit to start listening

  app.enableShutdownHooks();
  logger.log('CDN Worker is running');
}

bootstrap();
