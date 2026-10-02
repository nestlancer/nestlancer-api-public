import { Test, TestingModule } from '@nestjs/testing';
import { NotificationSegmentService } from '../../../src/notifications/notification-segment.service';
import { PrismaReadService } from '@nestlancer/database';
import { NotificationsAdminService } from '../../../src/notifications/notifications-admin.service';

describe('NotificationSegmentService', () => {
  let provider: NotificationSegmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationSegmentService,
        { provide: PrismaReadService, useValue: {} },
        { provide: NotificationsAdminService, useValue: {} },
        // Add mocked dependencies here
      ],
    }).compile();

    provider = module.get<NotificationSegmentService>(NotificationSegmentService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
