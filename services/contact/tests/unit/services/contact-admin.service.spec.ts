import { Test, TestingModule } from '@nestjs/testing';

import { ContactStatus, ResourceNotFoundException } from '@nestlancer/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';

import { ContactAdminService } from '../../../src/services/contact-admin.service';

describe('ContactAdminService', () => {
  let service: ContactAdminService;
  let prismaWrite: jest.Mocked<PrismaWriteService>;
  let prismaRead: jest.Mocked<PrismaReadService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactAdminService,
        {
          provide: PrismaWriteService,
          useValue: {
            contactMessage: {
              update: jest.fn(),
            },
          },
        },
        {
          provide: PrismaReadService,
          useValue: {
            contactMessage: {
              count: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ContactAdminService>(ContactAdminService);
    prismaWrite = module.get(PrismaWriteService);
    prismaRead = module.get(PrismaReadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStatistics', () => {
    it('should return contact message statistics', async () => {
      prismaRead.contactMessage.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(5);

      const result = await service.getStatistics();

      expect(result).toEqual({ total: 100, newMessages: 20, spam: 5 });
      expect(prismaRead.contactMessage.count).toHaveBeenCalledTimes(3);
    });
  });

  describe('markAsSpam', () => {
    it('should throw ResourceNotFoundException if message not found', async () => {
      prismaRead.contactMessage.findUnique.mockResolvedValue(null);
      await expect(service.markAsSpam('1')).rejects.toThrow(ResourceNotFoundException);
    });

    it('should update status to SPAM', async () => {
      prismaRead.contactMessage.findUnique.mockResolvedValue({ id: '1' } as any);
      prismaWrite.contactMessage.update.mockResolvedValue({
        id: '1',
        status: ContactStatus.SPAM,
      } as any);

      const result = await service.markAsSpam('1');

      expect(prismaWrite.contactMessage.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: ContactStatus.SPAM },
      });
      expect(result.status).toBe(ContactStatus.SPAM);
    });
  });
});
