import { PaymentMethodsService } from '../../../src/services/payment-methods.service';

describe('PaymentMethodsService', () => {
  let service: PaymentMethodsService;
  let mockPrismaWrite: any;
  let mockPrismaRead: any;

  const mockMethod = {
    id: 'pm-1',
    userId: 'user-1',
    type: 'card',
    last4: '4242',
    cardBrand: 'Visa',
    isDefault: true,
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockPrismaRead = {
      savedPaymentMethod: {
        findMany: jest.fn().mockResolvedValue([mockMethod]),
        count: jest.fn().mockResolvedValue(1),
        findFirst: jest.fn().mockResolvedValue(mockMethod),
      },
    };
    mockPrismaWrite = {
      savedPaymentMethod: {
        create: jest.fn().mockResolvedValue({ ...mockMethod, id: 'pm-new' }),
        delete: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({ ...mockMethod, isDefault: true }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    service = new PaymentMethodsService(mockPrismaWrite, mockPrismaRead);
  });

  describe('getSavedMethods', () => {
    it('should return formatted payment methods', async () => {
      const result = await service.getSavedMethods('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].last4).toBe('4242');
    });
  });

  describe('addMethod', () => {
    it('should add a card payment method', async () => {
      const result = await service.addMethod('user-1', {
        type: 'card',
        tokenId: 'token_AbCdEf123456',
        last4: '1234',
        cardBrand: 'Mastercard',
      } as any);
      expect(result.id).toBe('pm-new');
    });

    it('should reject card without required fields', async () => {
      await expect(service.addMethod('user-1', { type: 'card' } as any)).rejects.toThrow();
    });

    it('should reject card with fake non-Razorpay tokenId', async () => {
      await expect(
        service.addMethod('user-1', {
          type: 'card',
          tokenId: 'tok_audit_20260920',
          last4: '9999',
          cardBrand: 'visa',
        } as any),
      ).rejects.toThrow();
    });

    it('should reject UPI without VPA', async () => {
      await expect(service.addMethod('user-1', { type: 'upi' } as any)).rejects.toThrow();
    });
  });

  describe('removeMethod', () => {
    it('should remove payment method', async () => {
      await service.removeMethod('user-1', 'pm-1');
      expect(mockPrismaWrite.savedPaymentMethod.delete).toHaveBeenCalled();
    });

    it('should throw for non-existent method', async () => {
      mockPrismaRead.savedPaymentMethod.findFirst.mockResolvedValue(null);
      await expect(service.removeMethod('user-1', 'invalid')).rejects.toThrow();
    });
  });

  describe('setDefaultMethod', () => {
    it('should set a method as default', async () => {
      const result = await service.setDefaultMethod('user-1', 'pm-1');
      expect(result.isDefault).toBe(true);
      expect(mockPrismaWrite.savedPaymentMethod.updateMany).toHaveBeenCalled();
    });
  });
});
