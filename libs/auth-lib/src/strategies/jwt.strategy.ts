import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload, AuthenticatedUser } from '../interfaces/auth.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const issuer = process.env.JWT_ISSUER || 'nestlancer-auth';
    // Accept portal audiences plus legacy nestlancer-api during roll-out.
    const audiences = [
      process.env.JWT_AUDIENCE || 'nestlancer-api',
      process.env.JWT_CLIENT_AUDIENCE || 'nestlancer-client',
      process.env.JWT_ADMIN_AUDIENCE || 'nestlancer-admin',
    ].filter(Boolean);

    super({
      // Bearer-only: cookie JWT extraction requires cookie-parser + CSRF (not implemented).
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: (process.env.JWT_ACCESS_PUBLIC_KEY ?? '').replace(/\\n/g, '\n'),
      algorithms: ['RS256'],
      issuer,
      audience: audiences,
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    if (payload.type && payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    return {
      userId: payload.sub,
      sub: payload.sub, // Alias for @ActiveUser('sub') compatibility
      email: payload.email,
      role: payload.role,
      portal: payload.portal,
      jti: payload.jti,
      iat: payload.iat || 0,
      exp: payload.exp || 0,
      isImpersonated: payload.isImpersonated === true,
      impersonationSessionId:
        typeof payload.impersonationSessionId === 'string'
          ? payload.impersonationSessionId
          : undefined,
      originalAdminId:
        typeof payload.originalAdminId === 'string' ? payload.originalAdminId : undefined,
    };
  }
}
