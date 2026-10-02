import { Test, TestingModule } from '@nestjs/testing';
import { NotificationBroadcastService } from '../../../src/notifications/notification-broadcast.service';
import { QueuePublisherService } from '@nestlancer/queue';
import { PrismaReadService } from '@nestlancer/database';

describe('NotificationBroadcastService', () => {
  let provider: NotificationBroadcastService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationBroadcastService,
        {
          provide: QueuePublisherService,
          useValue: { publish: jest.fn().mockResolvedValue(true) },
        },
        {
          provide: PrismaReadService,
          useValue: {
            user: { findMany: jest.fn().mockResolvedValue([{ id: 'user-1' }]) },
          },
        },
        // Add mocked dependencies here
      ],
    }).compile();

    provider = module.get<NotificationBroadcastService>(NotificationBroadcastService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
