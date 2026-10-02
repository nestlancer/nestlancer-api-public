import { Test, TestingModule } from '@nestjs/testing';
import { MessageReadService } from '../../../src/services/message-read.service';
import { MessagingAccessService } from '../../../src/services/messaging-access.service';
import { UnreadCountService } from '../../../src/services/unread-count.service';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { NotFoundException } from '@nestjs/common';

describe('MessageReadService', () => {
  let service: MessageReadService;
  let prismaWrite: jest.Mocked<PrismaWriteService>;
  let prismaRead: jest.Mocked<PrismaReadService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageReadService,
        {
          provide: PrismaWriteService,
          useValue: {
            message: { update: jest.fn() },
            $transaction: jest.fn(),
          },
        },
        {
          provide: PrismaReadService,
          useValue: {
            message: { findUnique: jest.fn(), findMany: jest.fn() },
          },
        },
        {
          provide: MessagingAccessService,
          useValue: {
            requireMessageAccess: jest.fn().mockResolvedValue(undefined),
            requireProjectParticipant: jest.fn().mockResolvedValue(undefined),
            requireThreadMember: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: UnreadCountService,
          useValue: {
            invalidateForUsers: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<MessageReadService>(MessageReadService);
    prismaWrite = module.get(PrismaWriteService);
    prismaRead = module.get(PrismaReadService);

    prismaWrite.$transaction.mockImplementation(async (cb: any) => {
      if (Array.isArray(cb)) return Promise.all(cb);
      return cb(prismaWrite);
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('markAsRead', () => {
    it('should throw NotFoundException if message not found', async () => {
      prismaRead.message.findUnique.mockResolvedValue(null);
      await expect(service.markAsRead('u1', 'm1')).rejects.toThrow(NotFoundException);
    });

    it('should add user to readBy if not already read', async () => {
      prismaRead.message.findUnique.mockResolvedValue({ id: 'm1', readBy: [] } as any);

      await service.markAsRead('u1', 'm1');

      expect(prismaWrite.message.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'm1' },
        }),
      );
      // readBy array passed to update should have length 1 and contain u1
      const updateData = prismaWrite.message.update.mock.calls[0][0].data;
      expect((updateData.readBy as any[]).length).toBe(1);
      expect((updateData.readBy as any[])[0].userId).toBe('u1');
    });

    it('should not update if already read', async () => {
      prismaRead.message.findUnique.mockResolvedValue({
        id: 'm1',
        readBy: [{ userId: 'u1', readAt: new Date() }],
      } as any);

      await service.markAsRead('u1', 'm1');

      expect(prismaWrite.message.update).not.toHaveBeenCalled();
    });
  });

  describe('markProjectMessagesAsRead', () => {
    it('should update unread messages in project', async () => {
      const mockMsgs = [
        { id: 'm1', readBy: [] }, // unread
        { id: 'm2', readBy: [{ userId: 'u1' }] }, // already read
      ];
      prismaRead.message.findMany.mockResolvedValue(mockMsgs as any);

      const result = await service.markProjectMessagesAsRead('u1', 'p1');

      expect(prismaRead.message.findMany).toHaveBeenCalledWith({
        where: { projectId: 'p1', NOT: { senderId: 'u1' } },
      });
      // Should only update m1
      expect(prismaWrite.message.update).toHaveBeenCalledTimes(1);
      expect(prismaWrite.message.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'm1' },
        }),
      );
      expect(result).toEqual({ success: true, updatedCount: 1 });
    });

    it('should return success and 0 updated if no unread messages', async () => {
      prismaRead.message.findMany.mockResolvedValue([]);

      const result = await service.markProjectMessagesAsRead('u1', 'p1');

      expect(prismaWrite.$transaction).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });
});
