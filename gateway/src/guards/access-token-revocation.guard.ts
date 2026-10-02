import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { AccessTokenRevocationService } from '@nestlancer/cache';
import { type AuthenticatedUser } from '@nestlancer/auth-lib';
import { IS_PUBLIC_KEY, isPublicDocumentationPath } from '@nestlancer/common';

@Injectable()
export class AccessTokenRevocationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly revocation: AccessTokenRevocationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const path = request?.path ?? request?.url ?? '';
    if (path && isPublicDocumentationPath(path)) return true;

    const user = request.user;
    if (!user?.sub) return true;

    const revoked = await this.revocation.isAccessTokenRevoked(
      user.sub,
      user.jti,
      user.iat || 0,
    );

    if (revoked) {
      throw new UnauthorizedException({
        code: 'AUTH_001',
        message: 'Invalid or missing authentication token',
      });
    }

    return true;
  }
}
