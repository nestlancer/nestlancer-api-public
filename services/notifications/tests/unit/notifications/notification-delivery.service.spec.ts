import { Test, TestingModule } from '@nestjs/testing';
import { NotificationDeliveryService } from '../../../src/notifications/notification-delivery.service';
import { QueuePublisherService } from '@nestlancer/queue';

describe('NotificationDeliveryService', () => {
  let provider: NotificationDeliveryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationDeliveryService,
        { provide: QueuePublisherService, useValue: {} },
        // Add mocked dependencies here
      ],
    }).compile();

    provider = module.get<NotificationDeliveryService>(NotificationDeliveryService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
