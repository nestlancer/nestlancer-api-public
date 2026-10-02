import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformPaymentAccountType, Prisma } from '@prisma/client';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';
import { BusinessLogicException, PAYMENT_GATE_ERROR } from '@nestlancer/common';
import {
  CreatePlatformPaymentAccountDto,
  UpdatePlatformPaymentAccountDto,
} from '../dto/platform-payment-account.dto';

const PUBLIC_SELECT = {
  id: true,
  label: true,
  type: true,
  accountHolderName: true,
  bankName: true,
  accountNumber: true,
  ifsc: true,
  accountType: true,
  upiVpa: true,
  instructions: true,
  currency: true,
  isPrimary: true,
  sortOrder: true,
} as const;

@Injectable()
export class PlatformPaymentAccountService {
  private readonly logger = new Logger(PlatformPaymentAccountService.name);
  private seedAttempted = false;

  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly configService: ConfigService,
  ) {}

  /** One-time seed from legacy COMPANY_BANK_* / COMPANY_UPI env when table is empty. */
  async ensureSeededFromEnv(): Promise<void> {
    if (this.seedAttempted) return;
    this.seedAttempted = true;

    const count = await this.prismaRead.platformPaymentAccount.count();
    if (count > 0) return;

    const bankName = this.configService.get<string>('COMPANY_BANK_NAME', '')?.trim() || '';
    const accountNumber =
      this.configService.get<string>('COMPANY_BANK_ACCOUNT', '')?.trim() || '';
    const ifsc = this.configService.get<string>('COMPANY_BANK_IFSC', '')?.trim() || '';
    const upiVpa = this.configService.get<string>('COMPANY_UPI', '')?.trim() || '';
    const holder =
      this.configService.get<string>('COMPANY_LEGAL_NAME', '')?.trim() ||
      this.configService.get<string>('COMPANY_NAME', 'Nestlancer')?.trim() ||
      'Nestlancer';

    if (!accountNumber && !upiVpa) {
      this.logger.warn(
        'No PlatformPaymentAccount rows and no COMPANY_BANK_*/COMPANY_UPI env to seed from',
      );
      return;
    }

    let type: PlatformPaymentAccountType = PlatformPaymentAccountType.BANK;
    if (accountNumber && upiVpa) type = PlatformPaymentAccountType.BOTH;
    else if (upiVpa) type = PlatformPaymentAccountType.UPI;

    await this.prismaWrite.platformPaymentAccount.create({
      data: {
        label: 'Primary settlement account',
        type,
        accountHolderName: holder,
        bankName: bankName || null,
        accountNumber: accountNumber || null,
        ifsc: ifsc || null,
        upiVpa: upiVpa || null,
        currency: 'INR',
        isActive: true,
        isPrimary: true,
        sortOrder: 0,
      },
    });
    this.logger.log('Seeded PlatformPaymentAccount from legacy company bank/UPI env');
  }

  async listAdmin() {
    await this.ensureSeededFromEnv();
    const accounts = await this.prismaRead.platformPaymentAccount.findMany({
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    // NL-BUG-PAY-005: empty list is an ops gap — surface how to provision.
    if (accounts.length === 0) {
      this.logger.warn(
        'No platform settlement accounts configured. Create one via POST /admin/payments/accounts ' +
          '(label, type BANK|UPI|BOTH, bank fields and/or upiVpa) or set COMPANY_BANK_*/COMPANY_UPI.',
      );
    }
    return accounts;
  }

  async listActivePublic() {
    await this.ensureSeededFromEnv();
    const accounts = await this.prismaRead.platformPaymentAccount.findMany({
      where: { isActive: true },
      select: PUBLIC_SELECT,
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return accounts;
  }

  async getPrimaryOrFirstActive() {
    await this.ensureSeededFromEnv();
    const primary = await this.prismaRead.platformPaymentAccount.findFirst({
      where: { isActive: true, isPrimary: true },
    });
    if (primary) return primary;
    return this.prismaRead.platformPaymentAccount.findFirst({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async getActiveById(id: string) {
    const account = await this.prismaRead.platformPaymentAccount.findFirst({
      where: { id, isActive: true },
    });
    if (!account) {
      throw new BusinessLogicException(
        'Platform payment account is unavailable',
        PAYMENT_GATE_ERROR.PLATFORM_ACCOUNT_UNAVAILABLE,
      );
    }
    return account;
  }

  private validateAccountFields(
    type: PlatformPaymentAccountType,
    data: {
      accountNumber?: string | null;
      ifsc?: string | null;
      upiVpa?: string | null;
    },
  ) {
    if (type === PlatformPaymentAccountType.BANK || type === PlatformPaymentAccountType.BOTH) {
      if (!data.accountNumber?.trim() || !data.ifsc?.trim()) {
        throw new BusinessLogicException(
          'Bank accounts require accountNumber and IFSC',
          PAYMENT_GATE_ERROR.PLATFORM_ACCOUNT_UNAVAILABLE,
        );
      }
    }
    if (type === PlatformPaymentAccountType.UPI || type === PlatformPaymentAccountType.BOTH) {
      if (!data.upiVpa?.trim()) {
        throw new BusinessLogicException(
          'UPI accounts require a VPA',
          PAYMENT_GATE_ERROR.PLATFORM_ACCOUNT_UNAVAILABLE,
        );
      }
    }
  }

  private async clearOtherPrimaries(
    tx: Prisma.TransactionClient,
    exceptId?: string,
  ): Promise<void> {
    await tx.platformPaymentAccount.updateMany({
      where: {
        isPrimary: true,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      data: { isPrimary: false },
    });
  }

  async create(adminId: string, dto: CreatePlatformPaymentAccountDto) {
    this.validateAccountFields(dto.type, dto);
    // Default first active account to primary if none exist
    const existingCount = await this.prismaRead.platformPaymentAccount.count({
      where: { isActive: true },
    });
    const isPrimary = dto.isPrimary === true || (existingCount === 0 && dto.isPrimary !== false);

    return this.prismaWrite.$transaction(async (tx) => {
      if (isPrimary) await this.clearOtherPrimaries(tx);
      const created = await tx.platformPaymentAccount.create({
        data: {
          label: dto.label,
          type: dto.type,
          accountHolderName: dto.accountHolderName,
          bankName: dto.bankName,
          accountNumber: dto.accountNumber,
          ifsc: dto.ifsc,
          accountType: dto.accountType,
          upiVpa: dto.upiVpa,
          instructions: dto.instructions,
          currency: dto.currency || 'INR',
          isActive: dto.isActive ?? true,
          isPrimary,
          sortOrder: dto.sortOrder ?? 0,
          createdById: adminId,
          updatedById: adminId,
        },
      });
      await tx.auditLog.create({
        data: {
          action: 'PLATFORM_PAYMENT_ACCOUNT_CREATED',
          category: 'PAYMENT',
          resourceType: 'PLATFORM_PAYMENT_ACCOUNT',
          resourceId: created.id,
          userId: adminId,
          description: `Created platform payment account "${created.label}"`,
        },
      });
      return created;
    });
  }

  async update(adminId: string, id: string, dto: UpdatePlatformPaymentAccountDto) {
    const existing = await this.prismaRead.platformPaymentAccount.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Platform payment account not found');

    const nextType = dto.type ?? existing.type;
    this.validateAccountFields(nextType, {
      accountNumber: dto.accountNumber !== undefined ? dto.accountNumber : existing.accountNumber,
      ifsc: dto.ifsc !== undefined ? dto.ifsc : existing.ifsc,
      upiVpa: dto.upiVpa !== undefined ? dto.upiVpa : existing.upiVpa,
    });

    return this.prismaWrite.$transaction(async (tx) => {
      if (dto.isPrimary === true) await this.clearOtherPrimaries(tx, id);
      const updated = await tx.platformPaymentAccount.update({
        where: { id },
        data: {
          ...(dto.label !== undefined ? { label: dto.label } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.accountHolderName !== undefined
            ? { accountHolderName: dto.accountHolderName }
            : {}),
          ...(dto.bankName !== undefined ? { bankName: dto.bankName } : {}),
          ...(dto.accountNumber !== undefined ? { accountNumber: dto.accountNumber } : {}),
          ...(dto.ifsc !== undefined ? { ifsc: dto.ifsc } : {}),
          ...(dto.accountType !== undefined ? { accountType: dto.accountType } : {}),
          ...(dto.upiVpa !== undefined ? { upiVpa: dto.upiVpa } : {}),
          ...(dto.instructions !== undefined ? { instructions: dto.instructions } : {}),
          ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.isPrimary !== undefined ? { isPrimary: dto.isPrimary } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
          updatedById: adminId,
        },
      });
      await tx.auditLog.create({
        data: {
          action: 'PLATFORM_PAYMENT_ACCOUNT_UPDATED',
          category: 'PAYMENT',
          resourceType: 'PLATFORM_PAYMENT_ACCOUNT',
          resourceId: id,
          userId: adminId,
          description: `Updated platform payment account "${updated.label}"`,
        },
      });
      return updated;
    });
  }

  /** Soft-disable (never hard-delete while referenced). */
  async softDelete(adminId: string, id: string) {
    const existing = await this.prismaRead.platformPaymentAccount.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Platform payment account not found');

    return this.prismaWrite.$transaction(async (tx) => {
      const updated = await tx.platformPaymentAccount.update({
        where: { id },
        data: { isActive: false, isPrimary: false, updatedById: adminId },
      });
      // Promote another active account to primary if needed
      if (existing.isPrimary) {
        const next = await tx.platformPaymentAccount.findFirst({
          where: { isActive: true, id: { not: id } },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        });
        if (next) {
          await tx.platformPaymentAccount.update({
            where: { id: next.id },
            data: { isPrimary: true },
          });
        }
      }
      await tx.auditLog.create({
        data: {
          action: 'PLATFORM_PAYMENT_ACCOUNT_DISABLED',
          category: 'PAYMENT',
          resourceType: 'PLATFORM_PAYMENT_ACCOUNT',
          resourceId: id,
          userId: adminId,
          description: `Disabled platform payment account "${existing.label}"`,
        },
      });
      return updated;
    });
  }

  toCompanyBankFields(account: {
    bankName?: string | null;
    accountNumber?: string | null;
    ifsc?: string | null;
    upiVpa?: string | null;
  }) {
    return {
      bankName: account.bankName || '',
      accountNumber: account.accountNumber || '',
      ifsc: account.ifsc || '',
      upi: account.upiVpa || '',
    };
  }
}
