import { Injectable } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { ConfigService } from '@nestjs/config';
import { DeleteAccountDto } from '../dto/delete-account.dto';
import { BusinessLogicException } from '@nestlancer/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AccountService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly config: ConfigService,
  ) {}

  async requestAccountDeletion(userId: string, dto: DeleteAccountDto) {
    const user = await this.prismaRead.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new BusinessLogicException('User not found', 'USER_001');
    }

    // Assuming we verify password if standard login
    if (dto.password && user.passwordHash) {
      const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
      if (!isPasswordValid) {
        throw new BusinessLogicException('Current password is incorrect', 'USER_005');
      }
    }

    const gracePeriodDays =
      this.config.get<number>('usersService.gdpr.softDeleteGracePeriodDays') || 30;
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + gracePeriodDays);

    await this.prismaWrite.$transaction(async (tx: any) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          status: 'PENDING_DELETION',
          deletedAt: new Date(),
        },
      });

      // Revoke all sessions
      await tx.session.updateMany({
        where: { userId },
        data: { expiresAt: new Date() },
      });

      await tx.outbox.create({
        data: {
          type: 'USER_DELETION_REQUESTED',
          payload: { userId, deletionDate, reason: dto.reason, feedback: dto.feedback },
        },
      });
    });

    return {
      deletionScheduledAt: new Date(),
      deletionDate,
      gracePeriodDays,
      canCancelUntil: deletionDate,
    };
  }

  async cancelDeletionRequest(userId: string) {
    const user = await this.prismaRead.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new BusinessLogicException('User not found', 'USER_001');
    }

    if (user.status !== 'PENDING_DELETION') {
      return true; // Already active
    }

    await this.prismaWrite.$transaction(async (tx: any) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          status: 'ACTIVE',
          deletedAt: null,
        },
      });

      await tx.outbox.create({
        data: {
          type: 'USER_DELETION_CANCELLED',
          payload: { userId },
        },
      });
    });

    return true;
  }
}
