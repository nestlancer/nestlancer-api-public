import { Injectable } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { BusinessLogicException, generateUuid } from '@nestlancer/common';
import { EmailJobType, publishEmailJob } from '@nestlancer/email';
import { QueuePublisherService } from '@nestlancer/queue';
import { NestlancerConfigService as ConfigService } from '@nestlancer/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly queue: QueuePublisherService,
    private readonly config: ConfigService,
  ) {}

  async requestPasswordReset(email: string) {
    const user = await this.prismaRead.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });

    // Always succeed to prevent enumeration
    if (!user) return true;

    // Delete any existing unused reset tokens for this user
    await this.prismaWrite.verificationToken.deleteMany({
      where: {
        userId: user.id,
        type: 'PASSWORD_RESET',
      },
    });

    const resetToken = `reset_${generateUuid().replace(/-/g, '')}`;
    const expiresIn = this.config.get<number>('authService.tokens.passwordResetExpiresIn') || 3600;

    await this.prismaWrite.verificationToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        type: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      },
    });

    await this.prismaWrite.outbox.create({
      data: {
        type: 'PASSWORD_RESET_REQUESTED',
        payload: {
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          resetToken,
        },
      },
    });

    const frontendUrl = (
      this.config.getOptional<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      'http://localhost:3000'
    ).replace(/\/$/, '');
    await publishEmailJob(this.queue, {
      type: EmailJobType.PASSWORD_RESET,
      to: user.email,
      data: {
        userName: user.firstName || 'there',
        resetUrl: `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`,
        expiresIn: '1 hour',
      },
    });

    return true;
  }

  async resetPassword(token: string, newPassword: string) {
    const storedToken = await this.prismaRead.verificationToken.findFirst({
      where: {
        token,
        type: 'PASSWORD_RESET',
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!storedToken) {
      throw new BusinessLogicException('Invalid or expired reset token', 'AUTH_013');
    }

    const saltRounds = this.config.get<number>('authService.security.bcryptSaltRounds') || 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await this.prismaWrite.$transaction(async (tx: any) => {
      await tx.user.update({
        where: { id: storedToken.userId },
        data: { passwordHash },
      });

      // Delete the used token
      await tx.verificationToken.delete({
        where: { id: storedToken.id },
      });

      // Revoke all existing sessions so they have to login again
      await tx.session.updateMany({
        where: { userId: storedToken.userId },
        data: { expiresAt: new Date() },
      });

      await tx.outbox.create({
        data: {
          type: 'PASSWORD_RESET_COMPLETED',
          payload: {
            userId: storedToken.userId,
            email: storedToken.user.email,
          },
        },
      });
    });

    return { passwordChanged: true, changedAt: new Date() };
  }
}
