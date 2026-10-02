import { Injectable } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { BusinessLogicException, parseUserAgent } from '@nestlancer/common';

type SessionDeviceInfo = {
  type?: string;
  browser?: string;
  os?: string;
  lastAccessJti?: string;
} | null;

@Injectable()
export class SessionsService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  /** Session.token stores the refresh JTI; access JWT jti is deviceInfo.lastAccessJti. */
  private isCurrentSession(
    session: { token: string; deviceInfo?: SessionDeviceInfo | unknown },
    accessJti: string,
  ): boolean {
    if (!accessJti) return false;
    if (session.token === accessJti) return true;
    const device = session.deviceInfo as SessionDeviceInfo;
    return typeof device?.lastAccessJti === 'string' && device.lastAccessJti === accessJti;
  }

  async getSessions(userId: string, currentJti: string) {
    const sessions = await this.prismaRead.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: 'desc' },
    });

    return sessions.map((s: any) => {
      const ua = typeof s.userAgent === 'string' ? s.userAgent : '';
      const storedDevice = s.deviceInfo?.browser ? s.deviceInfo : null;
      return {
        id: s.id,
        device: storedDevice
          ? {
              type: storedDevice.type || 'desktop',
              browser: storedDevice.browser,
              os: storedDevice.os,
            }
          : parseUserAgent(ua),
        userAgent: ua || null,
        location: {
          ip: s.ip,
        },
        current: this.isCurrentSession(s, currentJti),
        createdAt: s.createdAt,
        lastActivityAt: s.lastActiveAt,
        expiresAt: s.expiresAt,
      };
    });
  }

  async getSessionById(userId: string, sessionId: string) {
    const session = await this.prismaRead.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new BusinessLogicException('Session not found', 'USER_003');
    }

    const ua = typeof session.userAgent === 'string' ? session.userAgent : '';
    const storedDevice = (session as any).deviceInfo?.browser ? (session as any).deviceInfo : null;
    return {
      id: session.id,
      device: storedDevice
        ? {
            type: storedDevice.type || 'desktop',
            browser: storedDevice.browser,
            os: storedDevice.os,
          }
        : parseUserAgent(ua),
      userAgent: ua || null,
      location: {
        ip: (session as any).ip,
      },
      createdAt: session.createdAt,
      lastActivityAt: (session as any).lastActiveAt,
      expiresAt: session.expiresAt,
    };
  }

  async terminateSession(userId: string, sessionId: string, currentJti: string) {
    const session = await this.prismaRead.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new BusinessLogicException('Session not found', 'USER_003');
    }

    if (this.isCurrentSession(session, currentJti)) {
      throw new BusinessLogicException(
        'Cannot terminate current session. Use logout instead.',
        'USER_004',
      );
    }

    await this.prismaWrite.session.update({
      where: { id: sessionId },
      data: { expiresAt: new Date() },
    });

    return { sessionId, terminatedAt: new Date() };
  }

  async terminateOtherSessions(userId: string, currentJti: string) {
    const sessions = await this.prismaRead.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, token: true, deviceInfo: true },
    });

    const otherIds = sessions
      .filter((s) => !this.isCurrentSession(s, currentJti))
      .map((s) => s.id);

    if (otherIds.length > 0) {
      await this.prismaWrite.session.updateMany({
        where: { id: { in: otherIds } },
        data: { expiresAt: new Date() },
      });
    }

    return true;
  }
}
