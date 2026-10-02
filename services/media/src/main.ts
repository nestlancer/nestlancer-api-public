import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { installJsonConsoleLogger, LoggerService } from '@nestlancer/logger';
import { initTracing, installHttpObservability } from '@nestlancer/tracing';
import { bootstrapMetrics } from '@nestlancer/metrics';
import {
  AppValidationPipe,
  AllExceptionsFilter,
  TransformResponseInterceptor,
  TimeoutInterceptor,
} from '@nestlancer/common';

async function bootstrap() {
  installJsonConsoleLogger();

  await initTracing(process.env.OTEL_SERVICE_NAME || 'nl-svc-media');

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const configService = app.get(ConfigService);
  const logger = app.get(LoggerService);

  app.useLogger(logger);
  app.setGlobalPrefix('api/v1');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Nestlancer Media Service')
    .setDescription('Media & file uploads API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  app.useGlobalPipes(new AppValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformResponseInterceptor(), new TimeoutInterceptor());

  app.enableCors({
    origin: configService.get<string | string[]>('CORS_ORIGINS') || '*',
    credentials: true,
  });

  installHttpObservability(app);

  const port = process.env.MEDIA_SERVICE_PORT || 3012;
  await app.listen(port);
  bootstrapMetrics(app);

  logger.log(`Media Service running on port ${port}`, 'Bootstrap');
}
bootstrap();
