import { Test, TestingModule } from '@nestjs/testing';
import { ImpersonationService } from '../../../src/services/impersonation.service';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AccessTokenRevocationService } from '@nestlancer/cache';
import { UserRole } from '@nestlancer/common';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ImpersonateUserDto } from '../../../src/dto/impersonate-user.dto';

describe('ImpersonationService', () => {
  let service: ImpersonationService;
  let prismaWrite: jest.Mocked<PrismaWriteService>;
  let prismaRead: jest.Mocked<PrismaReadService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let revocation: { revokeAccessJti: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImpersonationService,
        {
          provide: PrismaWriteService,
          useValue: {
            impersonationSession: {
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: PrismaReadService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
            impersonationSession: {
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: AccessTokenRevocationService,
          useValue: {
            revokeAccessJti: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<ImpersonationService>(ImpersonationService);
    prismaWrite = module.get(PrismaWriteService);
    prismaRead = module.get(PrismaReadService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    revocation = module.get(AccessTokenRevocationService);
    configService.get.mockImplementation((key: string) => {
      if (key === 'JWT_ACCESS_PRIVATE_KEY') {
        return '-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----';
      }
      return undefined;
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startImpersonation', () => {
    it('should throw NotFoundException if target user not found', async () => {
      prismaRead.user.findUnique.mockResolvedValue(null);
      await expect(service.startImpersonation('admin1', 'user1', {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if target user is admin', async () => {
      prismaRead.user.findUnique.mockResolvedValue({ id: 'user1', role: UserRole.ADMIN } as any);
      await expect(service.startImpersonation('admin1', 'user1', {} as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should start impersonation session successfully', async () => {
      const targetUser = { id: 'user1', email: 'test@user.com', role: UserRole.USER };
      prismaRead.user.findUnique.mockResolvedValue(targetUser as any);
      const session = { id: 'session1' };
      prismaWrite.impersonationSession.create.mockResolvedValue(session as any);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      const dto: ImpersonateUserDto = { reason: 'support ticket' };
      const result = await service.startImpersonation('admin1', 'user1', dto);

      expect(prismaWrite.impersonationSession.create).toHaveBeenCalled();
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: targetUser.id,
          isImpersonated: true,
          type: 'access',
          portal: 'client',
        }),
        expect.objectContaining({
          algorithm: 'RS256',
          expiresIn: '240m',
          issuer: 'nestlancer-auth',
          audience: 'nestlancer-client',
        }),
      );
      expect(result.token).toBe('mock-jwt-token');
      expect(result.impersonationSessionId).toBe(session.id);
      expect(result.impersonatedUser.id).toBe(targetUser.id);
    });

    it('should honor durationMinutes from the admin dialog payload', async () => {
      prismaRead.user.findUnique.mockResolvedValue({
        id: 'user1',
        email: 'test@user.com',
        role: UserRole.USER,
      } as any);
      prismaWrite.impersonationSession.create.mockResolvedValue({ id: 'session1' } as any);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      await service.startImpersonation('admin1', 'user1', {
        reason: 'Investigating a billing display bug',
        durationMinutes: 60,
      });

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ expiresIn: '60m' }),
      );
    });
  });

  describe('endImpersonation', () => {
    it('should end impersonation successfully', async () => {
      const session = { id: 'session1', endedAt: new Date(), accessJti: 'jti-1' };
      prismaWrite.impersonationSession.update.mockResolvedValue(session as any);

      const result = await service.endImpersonation('session1');
      expect(revocation.revokeAccessJti).toHaveBeenCalledWith('jti-1', expect.any(Number));

      expect(prismaWrite.impersonationSession.update).toHaveBeenCalledWith({
        where: { id: 'session1' },
        data: expect.objectContaining({ endedAt: expect.any(Date) }),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('getActiveSessions', () => {
    it('should return recent sessions with computed status', async () => {
      const sessions = [
        { id: '1', endedAt: null },
        { id: '2', endedAt: new Date('2026-01-01') },
      ];
      prismaRead.impersonationSession.findMany.mockResolvedValue(sessions as any);

      const result = await service.getActiveSessions();

      expect(prismaRead.impersonationSession.findMany).toHaveBeenCalledWith({
        take: 50,
        orderBy: { startedAt: 'desc' },
      });
      expect(result).toEqual([
        { id: '1', endedAt: null, status: 'active' },
        { id: '2', endedAt: new Date('2026-01-01'), status: 'ended' },
      ]);
    });
  });
});
