import { Module, Global, DynamicModule } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisIdempotencyStore } from './stores/redis.store';
import { DatabaseIdempotencyStore } from './stores/database.store';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { IdempotencyGuard } from './idempotency.guard';

@Global()
@Module({})
export class IdempotencyModule {
  static forRoot(): DynamicModule {
    return {
      module: IdempotencyModule,
      providers: [
        RedisIdempotencyStore,
        DatabaseIdempotencyStore,
        IdempotencyInterceptor,
        IdempotencyGuard,
        Reflector,
      ],
      exports: [
        RedisIdempotencyStore,
        DatabaseIdempotencyStore,
        IdempotencyInterceptor,
        IdempotencyGuard,
      ],
    };
  }
}
