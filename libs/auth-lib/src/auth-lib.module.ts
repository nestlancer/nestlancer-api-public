import { Module, Global } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_ACCESS_SECRET,
        signOptions: { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' },
      }),
    }),
  ],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    Reflector,
  ],
  exports: [
    JwtModule,
    PassportModule,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    Reflector,
  ],
})
export class AuthLibModule {}
