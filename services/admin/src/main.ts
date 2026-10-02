import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { installJsonConsoleLogger, LoggerService } from '@nestlancer/logger';
import { AppModule } from './app.module';
import { initTracing, installHttpObservability } from '@nestlancer/tracing';
import { bootstrapMetrics } from '@nestlancer/metrics';
import {
  TransformResponseInterceptor,
  AllExceptionsFilter,
  HttpExceptionFilter,
  API_PREFIX,
} from '@nestlancer/common';

async function bootstrap() {
  installJsonConsoleLogger();

  await initTracing(process.env.OTEL_SERVICE_NAME || 'nl-svc-admin');

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(LoggerService);
  app.useLogger(logger);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('ADMIN_SERVICE_PORT') || 3005;

  app.setGlobalPrefix(API_PREFIX);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Nestlancer Admin Service')
    .setDescription('Administration API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalInterceptors(new TransformResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

  app.enableCors({
    origin: configService.get<string>('CORS_ORIGINS')?.split(',') || '*',
    methods: configService.get<string>('CORS_METHODS') || 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    credentials: configService.get<boolean>('CORS_CREDENTIALS') ?? true,
  });

  installHttpObservability(app);

  await app.listen(port);
  bootstrapMetrics(app);
  logger.log(`Admin Service is running on: ${await app.getUrl()}`);
}
bootstrap();
