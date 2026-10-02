import { ConfigService } from '@nestjs/config';
import {
  Injectable,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { JwtService } from '@nestjs/jwt';
import { AccessTokenRevocationService } from '@nestlancer/cache';
import { UserRole, generateUuid } from '@nestlancer/common';
import { ImpersonateUserDto } from '../dto/impersonate-user.dto';
import { ADMIN_CONFIG } from '../config/admin.config';

@Injectable()
export class ImpersonationService {
  private readonly logger = new Logger(ImpersonationService.name);

  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly revocation: AccessTokenRevocationService,
  ) {}

  /** Same RS256 access-token shape the gateway accepts for the client portal. */
  private clientAccessSigningOptions(expiresIn: string): {
    algorithm: 'RS256';
    secret: string;
    expiresIn: string;
    issuer: string;
    audience: string;
  } {
    const privateKey = (this.configService.get<string>('JWT_ACCESS_PRIVATE_KEY') ?? '').replace(
      /\\n/g,
      '\n',
    );
    if (!privateKey.includes('BEGIN')) {
      throw new InternalServerErrorException(
        'Impersonation cannot start because the client access signing key is not configured',
      );
    }

    return {
      algorithm: 'RS256',
      secret: privateKey,
      expiresIn,
      issuer: this.configService.get<string>('JWT_ISSUER') || 'nestlancer-auth',
      audience: this.configService.get<string>('JWT_CLIENT_AUDIENCE') || 'nestlancer-client',
    };
  }

  async startImpersonation(adminId: string, targetUserId: string, dto: ImpersonateUserDto) {
    // Basic structural check if user exists and isn't admin
    const targetUser = await this.prismaRead.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) throw new NotFoundException('User not found');

    if (targetUser.role === UserRole.ADMIN) {
      throw new ForbiddenException({
        code: 'ADMIN_008',
        message: 'Cannot impersonate admin users',
        details: { targetUserId, targetUserRole: targetUser.role },
      });
    }

    const maxMinutes = ADMIN_CONFIG.MAX_IMPERSONATION_DURATION_HOURS * 60;
    const durationMinutes =
      dto.durationMinutes == null
        ? maxMinutes
        : Math.min(maxMinutes, Math.max(1, Math.floor(dto.durationMinutes)));

    const accessJti = generateUuid();
    const session = await this.prismaWrite.impersonationSession.create({
      data: {
        adminId,
        targetUserId,
        reason: dto.reason,
        ticketId: dto.ticketId,
        accessJti,
        startedAt: new Date(),
      },
    });

    const payload = {
      sub: targetUser.id,
      email: targetUser.email,
      role: targetUser.role,
      type: 'access',
      jti: accessJti,
      portal: 'client',
      isImpersonated: true,
      originalAdminId: adminId,
      impersonationSessionId: session.id,
    };

    const token = this.jwtService.sign(
      payload,
      this.clientAccessSigningOptions(`${durationMinutes}m`),
    );

    this.logger.log(`Admin ${adminId} started impersonating user ${targetUserId}`);

    return {
      impersonationSessionId: session.id,
      originalUser: { id: adminId, role: UserRole.ADMIN },
      impersonatedUser: { id: targetUser.id, email: targetUser.email, role: targetUser.role },
      token,
      expiresAt: new Date(Date.now() + durationMinutes * 60_000),
      restrictions: ['Cannot change password', 'Cannot delete account', 'Cannot modify 2FA'],
    };
  }

  async endImpersonation(sessionId: string) {
    try {
      const session = await this.prismaWrite.impersonationSession.update({
        where: { id: sessionId },
        data: { endedAt: new Date() },
      });
      if (session.accessJti) {
        const expiresAtEpochSec =
          Math.floor(Date.now() / 1000) + ADMIN_CONFIG.MAX_IMPERSONATION_DURATION_HOURS * 60 * 60;
        await this.revocation.revokeAccessJti(session.accessJti, expiresAtEpochSec).catch((revokeError: unknown) => {
          this.logger.warn(
            `Impersonation ${sessionId} ended but its access token could not be revoked: ${
              revokeError instanceof Error ? revokeError.message : 'unknown error'
            }`,
          );
        });
      }
      return { success: true, message: 'Impersonation ended', session };
    } catch (err: any) {
      if (err?.code === 'P2025') {
        throw new NotFoundException('Impersonation session not found');
      }
      throw err;
    }
  }

  async getActiveSessions(limit = 50) {
    const sessions = await this.prismaRead.impersonationSession.findMany({
      take: limit,
      orderBy: { startedAt: 'desc' },
    });

    return sessions.map((session) => ({
      ...session,
      status: session.endedAt ? 'ended' : 'active',
    }));
  }
}
