import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import {
  AllExceptionsFilter,
  HttpExceptionFilter,
  TransformResponseInterceptor,
} from '@nestlancer/common';
import { installJsonConsoleLogger, LoggerService } from '@nestlancer/logger';
import { bootstrapMetrics } from '@nestlancer/metrics';
import { initTracing, installHttpObservability } from '@nestlancer/tracing';

import { AppModule } from './app.module';

async function bootstrap() {
  installJsonConsoleLogger();

  await initTracing(process.env.OTEL_SERVICE_NAME || 'nl-svc-contact');

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(LoggerService);
  app.useLogger(logger);

  app.enableCors();

  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('API_PREFIX') || '/api/v1';
  app.setGlobalPrefix(apiPrefix);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Nestlancer Contact Service')
    .setDescription('Contact form API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalInterceptors(new TransformResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

  installHttpObservability(app);

  const port = configService.get<number>('CONTACT_SERVICE_PORT') || 3015;

  await app.listen(port);
  bootstrapMetrics(app);
  logger.log(`Contact Service is running on: ${await app.getUrl()}`);
}
bootstrap();
