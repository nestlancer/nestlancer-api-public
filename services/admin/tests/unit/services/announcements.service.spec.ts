import { Test, TestingModule } from '@nestjs/testing';
import { AnnouncementsService } from '../../../src/services/announcements.service';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { CacheService } from '@nestlancer/cache';
import { QueuePublisherService } from '@nestlancer/queue';

describe('AnnouncementsService', () => {
  let service: AnnouncementsService;
  const publish = jest.fn();
  const upsert = jest.fn();
  const findUnique = jest.fn();
  const findMany = jest.fn();
  const createMany = jest.fn();
  const redisPublish = jest.fn();

  beforeEach(async () => {
    publish.mockReset();
    upsert.mockReset();
    findUnique.mockReset().mockResolvedValue(null);
    findMany.mockReset().mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
    createMany.mockReset().mockResolvedValue({ count: 2 });
    redisPublish.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnouncementsService,
        {
          provide: PrismaWriteService,
          useValue: {
            systemConfig: { findUnique, upsert },
            notification: { createMany },
          },
        },
        {
          provide: PrismaReadService,
          useValue: { user: { findMany } },
        },
        { provide: QueuePublisherService, useValue: { publish } },
        {
          provide: CacheService,
          useValue: { getClient: () => ({ publish: redisPublish }) },
        },
      ],
    }).compile();

    service = module.get<AnnouncementsService>(AnnouncementsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create in-app notifications and publish broadcast', async () => {
    const result = await service.send(
      {
        title: 'Hello',
        message: 'World',
        type: 'INFO' as any,
        dismissable: true,
      },
      'admin-1',
    );

    expect(result.id).toBeTruthy();
    expect(result.sentAt).toBeTruthy();
    expect(result.recipientCount).toBe(2);
    expect(result.deliveredCount).toBe(2);
    expect(createMany).toHaveBeenCalled();
    expect(publish).toHaveBeenCalledWith(
      'nestlancer.events',
      'notification.broadcast',
      expect.objectContaining({
        type: 'BROADCAST_ANNOUNCEMENT',
        title: 'Hello',
        message: 'World',
        userIds: ['u1', 'u2'],
      }),
    );
    expect(upsert).toHaveBeenCalled();
  });
});
