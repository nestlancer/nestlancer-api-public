import { Test, TestingModule } from '@nestjs/testing';
import { WebhookWorkerService } from '../../../src/services/webhook-worker.service';
import { ModuleRef } from '@nestjs/core';
import { ResourceNotFoundException } from '@nestlancer/common';
import { PaymentCapturedHandler } from '../../../src/handlers/razorpay/payment-captured.handler';
import { PaymentFailedHandler } from '../../../src/handlers/razorpay/payment-failed.handler';
import { RefundProcessedHandler } from '../../../src/handlers/razorpay/refund-processed.handler';
import { DisputeCreatedHandler } from '../../../src/handlers/razorpay/dispute-created.handler';
import { GithubPushHandler } from '../../../src/handlers/github/push.handler';
import { GithubPullRequestHandler } from '../../../src/handlers/github/pull-request.handler';
import { GithubDeploymentHandler } from '../../../src/handlers/github/deployment.handler';

describe('WebhookWorkerService', () => {
  let service: WebhookWorkerService;
  let moduleRef: jest.Mocked<ModuleRef>;

  const mockHandlers = {
    'razorpay:payment.captured': { canHandle: jest.fn(), handle: jest.fn() },
    'github:push': { canHandle: jest.fn(), handle: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookWorkerService,
        {
          provide: ModuleRef,
          useValue: {
            get: jest.fn().mockImplementation((token: any) => {
              if (token === PaymentCapturedHandler)
                return mockHandlers['razorpay:payment.captured'];
              if (token === GithubPushHandler) return mockHandlers['github:push'];
              // return dummies for others so handler array is populated without deep mocking each
              return { canHandle: jest.fn().mockReturnValue(false), handle: jest.fn() };
            }),
          },
        },
      ],
    }).compile();

    service = module.get<WebhookWorkerService>(WebhookWorkerService);
    moduleRef = module.get(ModuleRef);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should load all handlers via ModuleRef', () => {
      service.onModuleInit();
      expect(moduleRef.get).toHaveBeenCalledWith(PaymentCapturedHandler);
      expect(moduleRef.get).toHaveBeenCalledWith(GithubPushHandler);
      // Should verify all imports eventually, keeping it brief for mocking
      expect(moduleRef.get).toHaveBeenCalledTimes(7);
    });
  });

  describe('dispatch', () => {
    it('should find matching handler and delegate', async () => {
      mockHandlers['razorpay:payment.captured'].canHandle.mockImplementation(
        (p, e) => p === 'razorpay' && e === 'payment.captured',
      );
      mockHandlers['razorpay:payment.captured'].handle.mockResolvedValue(true);

      service.onModuleInit();
      await service.dispatch('razorpay', 'payment.captured', { test: true });

      expect(mockHandlers['razorpay:payment.captured'].handle).toHaveBeenCalledWith({ test: true });
    });

    it('should throw ResourceNotFoundException if no handler found', async () => {
      service.onModuleInit();
      await expect(service.dispatch('unknown', 'event', {})).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });
});
