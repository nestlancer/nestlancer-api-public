import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../interfaces/auth.interface';

export function createAccessToken(
  jwtService: JwtService,
  payload: Omit<JwtPayload, 'iat' | 'exp'>,
): string {
  return jwtService.sign({ sub: payload.sub, email: payload.email, role: payload.role });
}

export function createRefreshToken(jwtService: JwtService, userId: string): string {
  return jwtService.sign(
    { sub: userId, type: 'refresh' },
    { expiresIn: '7d', secret: process.env.JWT_REFRESH_SECRET },
  );
}
