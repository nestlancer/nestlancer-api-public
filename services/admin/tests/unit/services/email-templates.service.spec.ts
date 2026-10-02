import { Test, TestingModule } from '@nestjs/testing';
import { EmailTemplatesService } from '../../../src/services/email-templates.service';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { QueuePublisherService } from '@nestlancer/queue';
import { NotFoundException } from '@nestjs/common';
import { UpdateEmailTemplateDto } from '../../../src/dto/update-email-template.dto';

describe('EmailTemplatesService', () => {
  let service: EmailTemplatesService;
  let prismaWrite: jest.Mocked<PrismaWriteService>;
  let prismaRead: jest.Mocked<PrismaReadService>;
  let queueService: jest.Mocked<QueuePublisherService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailTemplatesService,
        {
          provide: PrismaWriteService,
          useValue: {
            emailTemplate: {
              update: jest.fn(),
            },
          },
        },
        {
          provide: PrismaReadService,
          useValue: {
            emailTemplate: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: QueuePublisherService,
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EmailTemplatesService>(EmailTemplatesService);
    prismaWrite = module.get(PrismaWriteService);
    prismaRead = module.get(PrismaReadService);
    queueService = module.get(QueuePublisherService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all templates', async () => {
      const mockTemplates = [{ id: '1', subject: 'Welcome' }];
      prismaRead.emailTemplate.findMany.mockResolvedValue(mockTemplates as any);

      const result = await service.findAll();
      expect(prismaRead.emailTemplate.findMany).toHaveBeenCalled();
      expect(result).toEqual(mockTemplates);
    });
  });

  describe('findOne', () => {
    it('should return a template if found', async () => {
      const mockTemplate = { id: '1', subject: 'Welcome' };
      prismaRead.emailTemplate.findUnique.mockResolvedValue(mockTemplate as any);

      const result = await service.findOne('1');
      expect(prismaRead.emailTemplate.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual(mockTemplate);
    });

    it('should throw NotFoundException if not found', async () => {
      prismaRead.emailTemplate.findUnique.mockResolvedValue(null);

      await expect(service.findOne('99')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update the template if it exists', async () => {
      const mockTemplate = { id: '1', subject: 'Old' };
      prismaRead.emailTemplate.findUnique.mockResolvedValue(mockTemplate as any);

      const dto: UpdateEmailTemplateDto = { subject: 'New', body: 'Body' };
      const updatedTemplate = { ...mockTemplate, ...dto };
      prismaWrite.emailTemplate.update.mockResolvedValue(updatedTemplate as any);

      const result = await service.update('1', dto);

      expect(prismaWrite.emailTemplate.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { subject: dto.subject, body: dto.body },
      });
      expect(result).toEqual(updatedTemplate);
    });
  });

  describe('sendTestEmail', () => {
    it('should publish test email message to queue', async () => {
      const mockTemplate = { id: 'template-id' };
      jest.spyOn(service, 'findOne').mockResolvedValue(mockTemplate as any);
      queueService.publish.mockResolvedValue(undefined as any);

      const result = await service.sendTestEmail('template-id', 'test@test.com');

      expect(service.findOne).toHaveBeenCalledWith('template-id');
      expect(queueService.publish).toHaveBeenCalledWith('email', 'TEMPLATE_TEST', {
        to: 'test@test.com',
        templateId: mockTemplate.id,
        mockData: true,
      });
      expect(result).toEqual({ success: true, message: 'Test email queued for test@test.com' });
    });
  });
});
