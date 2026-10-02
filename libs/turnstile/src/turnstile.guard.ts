import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TurnstileService } from './turnstile.service';
import { REQUIRE_TURNSTILE_KEY } from './decorators/require-turnstile.decorator';

@Injectable()
export class TurnstileGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly turnstileService: TurnstileService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.get<boolean>(REQUIRE_TURNSTILE_KEY, context.getHandler());
    if (!required) return true;
    if (process.env.NODE_ENV === 'test') return true;
    if (!this.turnstileService.isEnabled()) return true;

    const request = context.switchToHttp().getRequest();
    const token = request.body?.['cf-turnstile-response'] || request.headers['x-turnstile-token'];
    if (!token)
      throw new UnauthorizedException({
        code: 'AUTH_TURNSTILE_FAILED',
        message: 'Turnstile token required',
      });

    const result = await this.turnstileService.verify(token, request.ip);
    if (!result.success)
      throw new UnauthorizedException({
        code: 'AUTH_TURNSTILE_FAILED',
        message: 'Turnstile verification failed',
      });
    return true;
  }
}
