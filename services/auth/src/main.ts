import { NestFactory } from '@nestjs/core';
import { LoggerService, installJsonConsoleLogger } from '@nestlancer/logger';
import { AppModule } from './app.module';
import { NestlancerConfigService as ConfigService } from '@nestlancer/config';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AllExceptionsFilter, TransformResponseInterceptor } from '@nestlancer/common';
import { initTracing, installHttpObservability } from '@nestlancer/tracing';
import { bootstrapMetrics } from '@nestlancer/metrics';

async function bootstrap() {
  installJsonConsoleLogger();

  await initTracing(process.env.OTEL_SERVICE_NAME || 'nl-svc-auth');

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app
    .getHttpAdapter()
    .getInstance()
    .set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || '1') || 1);

  const logger = app.get(LoggerService);
  app.useLogger(logger);

  const configService = app.get(ConfigService);
  const port = configService.getOptional<number>('AUTH_SERVICE_PORT', 3001) ?? 3001;
  const allowedOrigins = configService.getOptional<string>('ALLOWED_ORIGINS', '*') ?? '*';

  app.enableCors({
    origin: allowedOrigins.split(','),
    credentials: true,
  });

  app.setGlobalPrefix('api/v1/auth');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Nestlancer Auth Service')
    .setDescription('Authentication & authorization API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalInterceptors(new TransformResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  installHttpObservability(app);

  app.enableShutdownHooks();

  await app.listen(port);
  bootstrapMetrics(app);
  logger.log(`Auth Service is running on port ${port}`, 'Bootstrap');
}
bootstrap();
