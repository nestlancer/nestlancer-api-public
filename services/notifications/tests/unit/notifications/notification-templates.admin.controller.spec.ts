import { Test, TestingModule } from '@nestjs/testing';
import { NotificationTemplatesAdminController } from '../../../src/notifications/notification-templates.admin.controller';
import { Reflector } from '@nestjs/core';
import { NotificationTemplatesService } from '../../../src/notifications/notification-templates.service';
import { CreateNotificationTemplateDto } from '../../../src/dto/create-notification-template.dto';
import { UpdateNotificationTemplateDto } from '../../../src/dto/update-notification-template.dto';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';

describe('NotificationTemplatesAdminController', () => {
  let controller: NotificationTemplatesAdminController;
  let templatesService: jest.Mocked<NotificationTemplatesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationTemplatesAdminController],
      providers: [
        { provide: Reflector, useValue: { get: jest.fn(), getAllAndOverride: jest.fn() } },
        {
          provide: NotificationTemplatesService,
          useValue: {
            findAll: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationTemplatesAdminController>(
      NotificationTemplatesAdminController,
    );
    templatesService = module.get(NotificationTemplatesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getTemplates', () => {
    it('should call templatesService.findAll', async () => {
      templatesService.findAll.mockResolvedValue([] as any);

      const result = await controller.getTemplates();

      expect(templatesService.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('createTemplate', () => {
    it('should call templatesService.create', async () => {
      templatesService.create.mockResolvedValue({ id: '1' } as any);
      const dto = new CreateNotificationTemplateDto();

      const result = await controller.createTemplate(dto);

      expect(templatesService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: '1' });
    });
  });

  describe('updateTemplate', () => {
    it('should call templatesService.update', async () => {
      templatesService.update.mockResolvedValue({ id: '1' } as any);
      const dto = new UpdateNotificationTemplateDto();

      const result = await controller.updateTemplate('1', dto);

      expect(templatesService.update).toHaveBeenCalledWith('1', dto);
      expect(result).toEqual({ id: '1' });
    });
  });

  describe('deleteTemplate', () => {
    it('should call templatesService.delete', async () => {
      templatesService.delete.mockResolvedValue({ deleted: true } as any);

      const result = await controller.deleteTemplate('1');

      expect(templatesService.delete).toHaveBeenCalledWith('1');
      expect(result).toEqual({ deleted: true });
    });
  });
});
