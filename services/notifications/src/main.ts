import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { initTracing, installHttpObservability } from '@nestlancer/tracing';
import { bootstrapMetrics } from '@nestlancer/metrics';
import { installJsonConsoleLogger, LoggerService } from '@nestlancer/logger';
import {
  AppValidationPipe,
  AllExceptionsFilter,
  TransformResponseInterceptor,
  TimeoutInterceptor,
} from '@nestlancer/common';

async function bootstrap() {
  installJsonConsoleLogger();

  await initTracing(process.env.OTEL_SERVICE_NAME || 'nl-svc-notifications');

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const configService = app.get(ConfigService);
  const logger = app.get(LoggerService);

  app.useLogger(logger);
  app.setGlobalPrefix('api/v1');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Nestlancer Notifications Service')
    .setDescription('User notifications API')
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

  const port = process.env.NOTIFICATIONS_SERVICE_PORT || 3011;
  await app.listen(port);
  bootstrapMetrics(app);

  logger.log(`Notifications Service running on port ${port}`, 'Bootstrap');
}
bootstrap();
