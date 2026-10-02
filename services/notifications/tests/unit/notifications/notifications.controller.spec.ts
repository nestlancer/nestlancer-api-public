import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from '../../../src/notifications/notifications.controller';
import { NotificationsService } from '../../../src/notifications/notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: {
            findByUser: jest.fn(),
            getUnreadCount: jest.fn(),
            markRead: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
