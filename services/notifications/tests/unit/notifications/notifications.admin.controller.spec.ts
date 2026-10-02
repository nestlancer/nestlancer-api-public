import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsAdminController } from '../../../src/notifications/notifications.admin.controller';
import { Reflector } from '@nestjs/core';
import { NotificationsAdminService } from '../../../src/notifications/notifications-admin.service';
import { NotificationBroadcastService } from '../../../src/notifications/notification-broadcast.service';
import { NotificationSegmentService } from '../../../src/notifications/notification-segment.service';
import { QueryNotificationsDto } from '../../../src/dto/query-notifications.dto';
import { SendNotificationDto } from '../../../src/dto/send-notification.dto';
import { BroadcastNotificationDto } from '../../../src/dto/broadcast-notification.dto';
import { SegmentNotificationDto } from '../../../src/dto/segment-notification.dto';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';

describe('NotificationsAdminController', () => {
  let controller: NotificationsAdminController;
  let adminService: jest.Mocked<NotificationsAdminService>;
  let broadcastService: jest.Mocked<NotificationBroadcastService>;
  let segmentService: jest.Mocked<NotificationSegmentService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsAdminController],
      providers: [
        { provide: Reflector, useValue: { get: jest.fn(), getAllAndOverride: jest.fn() } },
        {
          provide: NotificationsAdminService,
          useValue: {
            findAll: jest.fn(),
            getStats: jest.fn(),
            getDeliveryReport: jest.fn(),
            sendTargeted: jest.fn(),
            clearUserNotifications: jest.fn(),
          },
        },
        {
          provide: NotificationBroadcastService,
          useValue: {
            broadcast: jest.fn(),
          },
        },
        {
          provide: NotificationSegmentService,
          useValue: {
            sendToSegment: jest.fn(),
          },
        },
        { provide: PrismaWriteService, useValue: {} },
        { provide: PrismaReadService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationsAdminController>(NotificationsAdminController);
    adminService = module.get(NotificationsAdminService);
    broadcastService = module.get(NotificationBroadcastService);
    segmentService = module.get(NotificationSegmentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllNotifications', () => {
    it('should call adminService.findAll', async () => {
      adminService.findAll.mockResolvedValue({ data: [], pagination: {} } as any);
      const query = new QueryNotificationsDto();

      const result = await controller.getAllNotifications(query);

      expect(adminService.findAll).toHaveBeenCalledWith(query);
      expect(result).toHaveProperty('data');
    });
  });

  describe('getStats', () => {
    it('should call adminService.getStats', async () => {
      adminService.getStats.mockResolvedValue({ totalCount: 0, unreadCount: 0 });

      const result = await controller.getStats();

      expect(adminService.getStats).toHaveBeenCalled();
      expect(result).toEqual({ totalCount: 0, unreadCount: 0 });
    });
  });

  describe('getDeliveryReport', () => {
    it('should call adminService.getDeliveryReport', async () => {
      adminService.getDeliveryReport.mockResolvedValue([] as any);

      const result = await controller.getDeliveryReport('1');

      expect(adminService.getDeliveryReport).toHaveBeenCalledWith('1');
      expect(result).toEqual([]);
    });
  });

  describe('sendNotification', () => {
    it('should call adminService.sendTargeted', async () => {
      adminService.sendTargeted.mockResolvedValue({ queued: 1 });
      const dto = new SendNotificationDto();

      const result = await controller.sendNotification(dto);

      expect(adminService.sendTargeted).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ queued: 1 });
    });
  });

  describe('broadcastNotification', () => {
    it('should call broadcastService.broadcast', async () => {
      broadcastService.broadcast.mockResolvedValue({ queued: 100 } as any);
      const dto = new BroadcastNotificationDto();

      const result = await controller.broadcastNotification(dto);

      expect(broadcastService.broadcast).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ queued: 100 });
    });
  });

  describe('sendToSegment', () => {
    it('should call segmentService.sendToSegment', async () => {
      segmentService.sendToSegment.mockResolvedValue({ queued: 50 } as any);
      const dto = new SegmentNotificationDto();

      const result = await controller.sendToSegment(dto);

      expect(segmentService.sendToSegment).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ queued: 50 });
    });
  });

  describe('clearUserNotifications', () => {
    it('should call adminService.clearUserNotifications', async () => {
      adminService.clearUserNotifications.mockResolvedValue({ count: 5 } as any);

      const result = await controller.clearUserNotifications('user1');

      expect(adminService.clearUserNotifications).toHaveBeenCalledWith('user1');
      expect(result).toEqual({ count: 5 });
    });
  });
});
