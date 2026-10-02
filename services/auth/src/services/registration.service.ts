import { Injectable } from '@nestjs/common';
import { PrismaWriteService } from '@nestlancer/database';
import { ReadOnly } from '@nestlancer/database';
import { ResourceConflictException, UserRole, UserStatus } from '@nestlancer/common';
import { EmailJobType, publishEmailJob } from '@nestlancer/email';
import { QueuePublisherService } from '@nestlancer/queue';
import { NestlancerConfigService as ConfigService } from '@nestlancer/config';
import { LoggerService } from '@nestlancer/logger';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from '../dto/register.dto';

@Injectable()
export class RegistrationService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly queue: QueuePublisherService,
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  async registerUser(
    dto: RegisterDto,
  ): Promise<{ user: any; emailVerificationToken: string; emailVerificationExpiresAt: Date }> {
    const existingUser = await this.prismaWrite.user.findFirst({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
    });

    if (existingUser) {
      this.logger.warn(
        `Registration attempt with existing email: ${dto.email}`,
        'RegistrationService',
      );
      throw new ResourceConflictException('Email already registered');
    }

    const saltRounds =
      this.config.getOptional<number>('authService.security.bcryptSaltRounds', 12) ?? 12;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const emailVerificationToken = `verify_${Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)}`;
    const verificationExpiresAt = new Date(
      Date.now() +
        (this.config.getOptional<number>('authService.tokens.emailVerificationExpiresIn', 86400) ??
          86400) *
          1000,
    );

    const user = await this.prismaWrite.$transaction(async (tx: any) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          emailVerified: false,
          marketingConsent: dto.marketingConsent || false,
          authConfig: {
            create: {
              twoFactorEnabled: false,
              failedLoginAttempts: 0,
            },
          },
          preferences: {
            create: {
              currency: 'INR',
              timezone: 'Asia/Kolkata',
              language: 'en',
            },
          },
          verificationTokens: {
            create: {
              token: emailVerificationToken,
              type: 'EMAIL_VERIFICATION',
              expiresAt: verificationExpiresAt,
            },
          },
        },
      });

      // Emit domain event for user creation using outbox pattern
      await tx.outbox.create({
        data: {
          type: 'USER_REGISTERED',
          aggregateType: 'User',
          aggregateId: newUser.id,
          payload: {
            userId: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            verificationToken: emailVerificationToken,
          },
        },
      });

      return newUser;
    });

    const frontendUrl = (
      this.config.getOptional<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      'http://localhost:3000'
    ).replace(/\/$/, '');
    await publishEmailJob(this.queue, {
      type: EmailJobType.VERIFICATION,
      to: user.email,
      data: {
        userName: user.firstName || 'there',
        verificationUrl: `${frontendUrl}/verify-email?token=${encodeURIComponent(emailVerificationToken)}`,
        expiresIn: '24 hours',
      },
    });

    return { user, emailVerificationToken, emailVerificationExpiresAt: verificationExpiresAt };
  }

  async checkEmail(email: string): Promise<boolean> {
    const count = await this.prismaWrite.user.count({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
    return count > 0;
  }
}
