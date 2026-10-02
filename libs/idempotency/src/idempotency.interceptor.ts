import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { IDEMPOTENT_KEY } from './decorators/idempotent.decorator';
import { RedisIdempotencyStore } from './stores/redis.store';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly store: RedisIdempotencyStore,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const isIdempotent = this.reflector.get<boolean>(IDEMPOTENT_KEY, context.getHandler());
    if (!isIdempotent) return next.handle();

    const request = context.switchToHttp().getRequest();
    const key = request.headers['x-idempotency-key'] as string | undefined;

    if (!key) {
      // For idempotent-marked endpoints, the header is required
      throw new HttpException(
        {
          status: 'error',
          error: {
            code: 'IDEM_001',
            message: 'X-Idempotency-Key header is required for this operation',
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Try to acquire lock to prevent concurrent requests with the same key
    const locked = await this.store.lock(key);
    if (!locked) {
      throw new HttpException(
        {
          status: 'error',
          error: {
            code: 'IDEM_002',
            message: 'A request with this idempotency key is already being processed',
          },
        },
        HttpStatus.CONFLICT,
      );
    }

    // Check for cached response
    const cached = await this.store.get(key);
    if (cached) {
      this.logger.debug(`Replaying cached response for idempotency key: ${key}`);
      await this.store.unlock(key);

      const response = context.switchToHttp().getResponse();
      response.status(cached.responseCode);
      return of(cached.responseBody);
    }

    // Process the request and cache the response
    return next.handle().pipe(
      tap(async (responseBody) => {
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode || 200;

        await this.store.set(
          key,
          {
            responseCode: statusCode,
            responseBody,
          },
          86400,
        ); // 24 hour TTL

        await this.store.unlock(key);
        this.logger.debug(`Cached response for idempotency key: ${key}`);
      }),
      catchError(async (error) => {
        await this.store.unlock(key);
        return throwError(() => error);
      }),
    );
  }
}
