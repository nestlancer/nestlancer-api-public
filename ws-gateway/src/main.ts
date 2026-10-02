import { NestFactory } from '@nestjs/core';
import { WsAppModule } from './app.module';
import { CustomRedisIoAdapter } from './adapters/redis-io.adapter';
import { Logger } from '@nestjs/common';
import { WsExceptionFilter } from './filters/ws-exception.filter';
import { RedisSubscriberService } from './services/redis-subscriber.service';
import { bootstrapMetrics } from '@nestlancer/metrics';
import { initTracing, installHttpObservability } from '@nestlancer/tracing';
import { installJsonConsoleLogger, LoggerService } from '@nestlancer/logger';

async function bootstrap() {
  installJsonConsoleLogger();

  await initTracing(process.env.OTEL_SERVICE_NAME || 'nl-ws-gateway');

  const bootstrapLogger = new Logger('WsGatewayBootstrap');
  const app = await NestFactory.create(WsAppModule, { bufferLogs: true });

  try {
    const logger = app.get(LoggerService);
    app.useLogger(logger);
  } catch {
    // LoggerModule not registered — JSON override still covers Nest Logger calls.
  }

  app.useGlobalFilters(new WsExceptionFilter());

  app.enableShutdownHooks();

  const redisIoAdapter = new CustomRedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  const port = Number(process.env.WS_PORT || 3100);

  installHttpObservability(app);


  await app.listen(port);
  bootstrapMetrics(app);
  await app.get(RedisSubscriberService).subscribeMessagingChatChannel();
  bootstrapLogger.log(`🔌 Nestlancer WebSocket Gateway running on wss://localhost:${port}`);
}

bootstrap();
