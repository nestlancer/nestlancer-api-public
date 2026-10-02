import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { TurnstileService } from '../services/turnstile.service';
import { getClientIp } from '@nestlancer/common';

@Injectable()
export class TurnstileGuard implements CanActivate {
  constructor(private turnstileService: TurnstileService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Infisical may omit TURNSTILE_SECRET_KEY — treat as intentionally disabled.
    if (!this.turnstileService.isEnabled()) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token =
      request.body?.turnstileToken ||
      request.query?.turnstileToken ||
      request.headers['x-turnstile-token'];

    const ipAddress = getClientIp(request) ?? undefined;
    await this.turnstileService.verifyToken(token, ipAddress);
    return true;
  }
}
