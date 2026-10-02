import { Test, TestingModule } from '@nestjs/testing';
import { PaymentMethodsController } from '../../../../src/controllers/user/payment-methods.controller';
import { PaymentMethodsService } from '../../../../src/services/payment-methods.service';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';
import { AddPaymentMethodDto } from '../../../../src/dto/add-payment-method.dto';

describe('PaymentMethodsController', () => {
  let controller: PaymentMethodsController;
  let methodsService: jest.Mocked<PaymentMethodsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentMethodsController],
      providers: [
        {
          provide: PaymentMethodsService,
          useValue: {
            getSavedMethods: jest.fn(),
            addMethod: jest.fn(),
            removeMethod: jest.fn(),
            setDefaultMethod: jest.fn(),
            updateNickname: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PaymentMethodsController>(PaymentMethodsController);
    methodsService = module.get(PaymentMethodsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMethods', () => {
    it('should list saved payment methods', async () => {
      methodsService.getSavedMethods.mockResolvedValue([{ id: 'pm1' }] as any);

      const result = await controller.getMethods('user1');

      expect(methodsService.getSavedMethods).toHaveBeenCalledWith('user1');
      expect(result).toEqual({ status: 'success', data: [{ id: 'pm1' }] });
    });
  });

  describe('addMethod', () => {
    it('should add a payment method', async () => {
      methodsService.addMethod.mockResolvedValue({ id: 'pmnew' } as any);
      const dto = new AddPaymentMethodDto();

      const result = await controller.addMethod('user1', dto);

      expect(methodsService.addMethod).toHaveBeenCalledWith('user1', dto);
      expect(result).toEqual({ status: 'success', data: { id: 'pmnew' } });
    });
  });

  describe('removeMethod', () => {
    it('should remove a method', async () => {
      methodsService.removeMethod.mockResolvedValue(undefined as any);

      const result = await controller.removeMethod('user1', 'pm1');

      expect(methodsService.removeMethod).toHaveBeenCalledWith('user1', 'pm1');
      expect(result).toEqual({ status: 'success' });
    });
  });

  describe('setDefault', () => {
    it('should set method as default', async () => {
      methodsService.setDefaultMethod.mockResolvedValue({ id: 'pm1', isDefault: true } as any);

      const result = await controller.setDefault('user1', 'pm1');

      expect(methodsService.setDefaultMethod).toHaveBeenCalledWith('user1', 'pm1');
      expect(result).toEqual({ status: 'success', data: { id: 'pm1', isDefault: true } });
    });
  });

  describe('updateNickname', () => {
    it('should update method nickname', async () => {
      methodsService.updateNickname.mockResolvedValue({ id: 'pm1', nickname: 'my card' } as any);

      const result = await controller.updateNickname('user1', 'pm1', 'my card');

      expect(methodsService.updateNickname).toHaveBeenCalledWith('user1', 'pm1', 'my card');
      expect(result).toEqual({ status: 'success', data: { id: 'pm1', nickname: 'my card' } });
    });
  });
});
