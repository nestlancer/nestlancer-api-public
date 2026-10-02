import { applyDecorators, UseGuards, SetMetadata } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { ROLES_KEY } from '../constants';

/** Combined auth + roles decorator. @Auth() = authenticated, @Auth('ADMIN') = admin only */
export const Auth = (...roles: string[]) =>
  applyDecorators(
    SetMetadata(ROLES_KEY, roles.length ? roles : undefined),
    UseGuards(JwtAuthGuard, ...(roles.length ? [RolesGuard] : [])),
  );
