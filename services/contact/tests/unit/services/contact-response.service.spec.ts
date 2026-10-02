import { Test, TestingModule } from '@nestjs/testing';

import { ResourceNotFoundException, ContactStatus } from '@nestlancer/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { OutboxService } from '@nestlancer/outbox';
import { QueuePublisherService } from '@nestlancer/queue';

import { RespondContactDto } from '../../../src/dto/respond-contact.dto';
import { ContactResponseService } from '../../../src/services/contact-response.service';

describe('ContactResponseService', () => {
  let service: ContactResponseService;
  let prismaWrite: jest.Mocked<PrismaWriteService>;
  let prismaRead: jest.Mocked<PrismaReadService>;
  let queuePublisher: jest.Mocked<QueuePublisherService>;
  let outbox: jest.Mocked<OutboxService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactResponseService,
        {
          provide: PrismaWriteService,
          useValue: {
            $transaction: jest.fn(),
            contactResponseLog: { create: jest.fn() },
            contactMessage: { update: jest.fn() },
          },
        },
        {
          provide: PrismaReadService,
          useValue: {
            contactMessage: { findUnique: jest.fn() },
            contactResponseLog: { findMany: jest.fn() },
          },
        },
        {
          provide: QueuePublisherService,
          useValue: {
            publish: jest.fn(),
            sendToQueue: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: OutboxService,
          useValue: { createEvent: jest.fn().mockResolvedValue('outbox-1') },
        },
      ],
    }).compile();

    service = module.get<ContactResponseService>(ContactResponseService);
    prismaWrite = module.get(PrismaWriteService);
    prismaRead = module.get(PrismaReadService);
    queuePublisher = module.get(QueuePublisherService);
    outbox = module.get(OutboxService);

    prismaWrite.$transaction.mockImplementation(async (cb: any) => cb(prismaWrite));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('respond', () => {
    it('should throw ResourceNotFoundException if message not found', async () => {
      prismaRead.contactMessage.findUnique.mockResolvedValue(null);
      await expect(service.respond('1', 'admin1', {} as any)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('should create response log, optionally update status, and publish event', async () => {
      const mockContact = { id: '1', email: 'test@user.com', name: 'User', ticketId: 'TCK' };
      prismaRead.contactMessage.findUnique.mockResolvedValue(mockContact as any);

      const mockLog = {
        id: 'log1',
        contactMessageId: '1',
        adminId: 'admin1',
        subject: 'Re:',
        message: 'Hi',
      };
      prismaWrite.contactResponseLog.create.mockResolvedValue(mockLog as any);

      const dto: RespondContactDto = { subject: 'Re:', message: 'Hi', markAsResponded: true };

      const result = await service.respond('1', 'admin1', dto);

      expect(prismaWrite.contactResponseLog.create).toHaveBeenCalled();
      expect(prismaWrite.contactMessage.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: ContactStatus.RESPONDED },
      });
      expect(outbox.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CONTACT_RESPONSE_SENT',
          payload: expect.objectContaining({
            contactId: '1',
            email: 'test@user.com',
            ticketId: 'TCK',
          }),
        }),
        prismaWrite,
      );
      expect(result.id).toEqual(mockLog.id);
    });
  });

  describe('getResponseHistory', () => {
    it('should return response history', async () => {
      const mockLogs = [
        {
          id: '1',
          contactMessageId: 'c1',
          adminId: 'admin1',
          subject: 's',
          message: 'm',
          sentAt: new Date(),
        },
      ];
      prismaRead.contactResponseLog.findMany.mockResolvedValue(mockLogs as any);

      const result = await service.getResponseHistory('c1');

      expect(prismaRead.contactResponseLog.findMany).toHaveBeenCalledWith({
        where: { contactMessageId: 'c1' },
        orderBy: { sentAt: 'desc' },
      });
      expect(result).toEqual(mockLogs);
    });
  });
});
