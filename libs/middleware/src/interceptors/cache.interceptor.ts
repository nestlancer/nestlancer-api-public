import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CACHEABLE_KEY, CacheableOptions, CacheService } from '@nestlancer/cache';

/**
 * Response-cache interceptor.
 *
 * Works in tandem with the @Cacheable() decorator:
 *
 *   @Get('featured')
 *   @Cacheable({ ttl: 7200 })          // 2-hour TTL
 *   async getFeatured() { … }
 *
 * Cache key: `http:cache:<path>[?<querystring>]`  (public routes only).
 * Do NOT apply to authenticated routes that return user-specific data.
 *
 * CacheService is injected optionally so the interceptor degrades gracefully
 * (passes straight through) when CacheModule is not registered in the app.
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Optional() private readonly cache?: CacheService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Only cache GET requests.
    const req = context.switchToHttp().getRequest();
    if (req.method !== 'GET') return next.handle();

    // Require @Cacheable() on the handler (or the controller class).
    const options: CacheableOptions | undefined = this.reflector?.getAllAndOverride<CacheableOptions>(
      CACHEABLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options || !this.cache) {
      // No decorator or no Redis – skip caching.
      return next.handle();
    }

    // ttl=0 (or negative) disables caching — used by FEATURED_CACHE_TTL / PUBLIC_CACHE_TTL=0 in tests.
    const ttl = options.ttl ?? 300; // seconds
    if (ttl <= 0) {
      return next.handle();
    }

    const qs = req.url.includes('?') ? '?' + req.url.split('?').slice(1).join('?') : '';
    const cacheKey = options.key ? options.key : `http:cache:${req.path}${qs}`;

    // Return a cold Observable so we can await the Redis read before subscribing the handler.
    return new Observable((subscriber) => {
      this.cache!
        .get(cacheKey)
        .then(async (cached: unknown) => {
          if (cached !== null && cached !== undefined) {
            applyHttpCacheControl(context, ttl);
            subscriber.next(cached);
            subscriber.complete();
            return;
          }

          // Single-flight: only one requester fills the cache on miss (stampede guard).
          const lockKey = `${cacheKey}:lock`;
          const gotLock = await this.cache!.setIfAbsent(lockKey, 1, Math.min(15, ttl)).catch(
            () => true,
          );

          if (!gotLock) {
            // Another worker is filling — brief wait then re-read, else fall through to handler.
            await new Promise((r) => setTimeout(r, 75));
            const retry = await this.cache!.get(cacheKey).catch(() => null);
            if (retry !== null && retry !== undefined) {
              applyHttpCacheControl(context, ttl);
              subscriber.next(retry);
              subscriber.complete();
              return;
            }
          }

          next
            .handle()
            .pipe(
              tap((response) => {
                applyHttpCacheControl(context, ttl);
                // Never cache empty public payloads — after reset/reseed an empty [] would stick
                // for FEATURED_CACHE_TTL / PUBLIC_CACHE_TTL hours (NL-PERF-CACHE-001).
                if (shouldCacheResponse(response)) {
                  this.cache!.set(cacheKey, response, ttl).catch(() => {
                    // Swallow Redis write errors; the response is already on its way.
                  });
                }
                this.cache!.del(lockKey).catch(() => undefined);
              }),
            )
            .subscribe({
              next: (val) => subscriber.next(val),
              error: (err) => {
                this.cache!.del(lockKey).catch(() => undefined);
                subscriber.error(err);
              },
              complete: () => subscriber.complete(),
            });
        })
        .catch(() => {
          // Redis read error – fall back to the handler without caching.
          next.handle().subscribe({
            next: (val) => subscriber.next(val),
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete(),
          });
        });
    });
  }
}

/** True when a handler result is worth writing to Redis (non-empty public payloads). */
export function shouldCacheResponse(response: unknown): boolean {
  if (response === null || response === undefined) return false;
  if (Array.isArray(response)) return response.length > 0;
  if (typeof response === 'object') {
    const o = response as Record<string, unknown>;
    if (Array.isArray(o.items) && o.items.length === 0) return false;
    if (Array.isArray(o.data) && o.data.length === 0) return false;
  }
  return true;
}

function applyHttpCacheControl(context: ExecutionContext, ttl: number): void {
  try {
    const res = context.switchToHttp().getResponse<{
      setHeader?: (name: string, value: string) => void;
      getHeader?: (name: string) => unknown;
    }>();
    if (!res?.setHeader || res.getHeader?.('Cache-Control')) return;
    const sMaxAge = Math.max(ttl, 60);
    res.setHeader(
      'Cache-Control',
      `public, max-age=60, s-maxage=${sMaxAge}, stale-while-revalidate=${sMaxAge * 2}`,
    );
  } catch {
    // Non-HTTP context (unit tests without a response).
  }
}
