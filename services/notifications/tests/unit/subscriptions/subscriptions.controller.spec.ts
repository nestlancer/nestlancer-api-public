import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsController } from '../../../src/subscriptions/subscriptions.controller';
import { SubscriptionsService } from '../../../src/subscriptions/subscriptions.service';

describe('SubscriptionsController', () => {
  let controller: SubscriptionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionsController],
      providers: [
        {
          provide: SubscriptionsService,
          useValue: {
            register: jest.fn(),
            unregister: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SubscriptionsController>(SubscriptionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
