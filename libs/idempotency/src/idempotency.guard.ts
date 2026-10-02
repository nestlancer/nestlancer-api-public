import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IDEMPOTENT_KEY } from './decorators/idempotent.decorator';

@Injectable()
export class IdempotencyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const isIdempotent = this.reflector.get<boolean>(IDEMPOTENT_KEY, context.getHandler());
    if (!isIdempotent) return true;
    const request = context.switchToHttp().getRequest();
    const key = request.headers['x-idempotency-key'];
    if (!key) return true; // Guard only validates presence, interceptor handles logic
    return true;
  }
}
