import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { BusinessLogicException } from '@nestlancer/common';

/** Razorpay token ids look like `token_AbCdEf…` — reject arbitrary audit fakes. */
const RAZORPAY_TOKEN_ID = /^token_[A-Za-z0-9]+$/;

interface SavedPaymentMethodResponse {
  id: string;
  type: string;
  last4?: string;
  cardBrand?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  upiVpa?: string;
  bankName?: string;
  walletProvider?: string;
  nickname?: string;
  isDefault: boolean;
  createdAt: Date;
}

interface AddPaymentMethodDto {
  type: 'card' | 'upi' | 'netbanking' | 'wallet';
  tokenId?: string;
  last4?: string;
  cardBrand?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  upiVpa?: string;
  bankName?: string;
  walletProvider?: string;
  nickname?: string;
  setAsDefault?: boolean;
}

@Injectable()
export class PaymentMethodsService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  async getSavedMethods(userId: string): Promise<SavedPaymentMethodResponse[]> {
    const methods = await this.prismaRead.savedPaymentMethod.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return methods.map(this.formatPaymentMethodResponse);
  }

  async addMethod(userId: string, data: AddPaymentMethodDto): Promise<SavedPaymentMethodResponse> {
    // Validate the payment method data
    this.validatePaymentMethodData(data);

    // If setting as default, unset other default methods
    if (data.setAsDefault) {
      await this.prismaWrite.savedPaymentMethod.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Check if this is the user's first payment method
    const existingCount = await this.prismaRead.savedPaymentMethod.count({
      where: { userId },
    });

    const method = await this.prismaWrite.savedPaymentMethod.create({
      data: {
        userId,
        type: data.type,
        tokenId: data.tokenId,
        last4: data.last4,
        cardBrand: data.cardBrand,
        cardExpMonth: data.cardExpMonth,
        cardExpYear: data.cardExpYear,
        upiVpa: data.upiVpa,
        bankName: data.bankName,
        walletProvider: data.walletProvider,
        nickname: data.nickname,
        isDefault: data.setAsDefault || existingCount === 0, // First method is always default
      },
    });

    return this.formatPaymentMethodResponse(method);
  }

  async removeMethod(userId: string, methodId: string): Promise<void> {
    const method = await this.prismaRead.savedPaymentMethod.findFirst({
      where: { id: methodId, userId },
    });

    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    await this.prismaWrite.savedPaymentMethod.delete({
      where: { id: methodId },
    });

    // If deleted method was default, set another method as default
    if (method.isDefault) {
      const nextMethod = await this.prismaRead.savedPaymentMethod.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (nextMethod) {
        await this.prismaWrite.savedPaymentMethod.update({
          where: { id: nextMethod.id },
          data: { isDefault: true },
        });
      }
    }
  }

  async setDefaultMethod(userId: string, methodId: string): Promise<SavedPaymentMethodResponse> {
    const method = await this.prismaRead.savedPaymentMethod.findFirst({
      where: { id: methodId, userId },
    });

    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    // Unset all other default methods
    await this.prismaWrite.savedPaymentMethod.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    // Set this method as default
    const updated = await this.prismaWrite.savedPaymentMethod.update({
      where: { id: methodId },
      data: { isDefault: true },
    });

    return this.formatPaymentMethodResponse(updated);
  }

  async updateNickname(
    userId: string,
    methodId: string,
    nickname: string,
  ): Promise<SavedPaymentMethodResponse> {
    const method = await this.prismaRead.savedPaymentMethod.findFirst({
      where: { id: methodId, userId },
    });

    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    const updated = await this.prismaWrite.savedPaymentMethod.update({
      where: { id: methodId },
      data: { nickname },
    });

    return this.formatPaymentMethodResponse(updated);
  }

  private validatePaymentMethodData(data: AddPaymentMethodDto): void {
    switch (data.type) {
      case 'card':
        if (!data.last4 || !data.cardBrand) {
          throw new BadRequestException(
            'Card details (last4, cardBrand) are required for card payment methods',
          );
        }
        // NL-BUG-METHOD-001: never persist an unverified / non-Razorpay tokenId.
        if (!data.tokenId || !RAZORPAY_TOKEN_ID.test(data.tokenId.trim())) {
          throw new BusinessLogicException(
            'A valid Razorpay card tokenId (token_…) is required',
            'PAYMENT_GATE_022',
          );
        }
        data.tokenId = data.tokenId.trim();
        break;
      case 'upi':
        if (!data.upiVpa) {
          throw new BadRequestException('UPI VPA is required for UPI payment methods');
        }
        break;
      case 'netbanking':
        if (!data.bankName) {
          throw new BadRequestException('Bank name is required for netbanking payment methods');
        }
        break;
      case 'wallet':
        if (!data.walletProvider) {
          throw new BadRequestException('Wallet provider is required for wallet payment methods');
        }
        break;
    }
  }

  private formatPaymentMethodResponse(method: any): SavedPaymentMethodResponse {
    return {
      id: method.id,
      type: method.type,
      last4: method.last4,
      cardBrand: method.cardBrand,
      cardExpMonth: method.cardExpMonth,
      cardExpYear: method.cardExpYear,
      upiVpa: method.upiVpa,
      bankName: method.bankName,
      walletProvider: method.walletProvider,
      nickname: method.nickname,
      isDefault: method.isDefault,
      createdAt: method.createdAt,
    };
  }
}
