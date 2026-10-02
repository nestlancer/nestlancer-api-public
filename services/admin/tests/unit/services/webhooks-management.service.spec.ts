import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksManagementService } from '../../../src/services/webhooks-management.service';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { NotFoundException } from '@nestjs/common';
import { CreateWebhookDto } from '../../../src/dto/create-webhook.dto';
import { UpdateWebhookDto } from '../../../src/dto/update-webhook.dto';
import * as crypto from 'crypto';

describe('WebhooksManagementService', () => {
  let service: WebhooksManagementService;
  let prismaWrite: jest.Mocked<PrismaWriteService>;
  let prismaRead: jest.Mocked<PrismaReadService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksManagementService,
        {
          provide: PrismaWriteService,
          useValue: {
            webhook: {
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: PrismaReadService,
          useValue: {
            webhook: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<WebhooksManagementService>(WebhooksManagementService);
    prismaWrite = module.get(PrismaWriteService);
    prismaRead = module.get(PrismaReadService);

    // Mock global fetch for testing testWebhook
    global.fetch = jest.fn() as any;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new webhook', async () => {
      const mockWebhook = { id: 'wh-1', name: 'Test', secret: 'sec' };
      prismaWrite.webhook.create.mockResolvedValue(mockWebhook as any);

      const dto: CreateWebhookDto = { name: 'Test', url: 'http://test.com', events: ['*'] };
      const result = await service.create(dto);

      expect(prismaWrite.webhook.create).toHaveBeenCalled();
      expect(result.id).toEqual(mockWebhook.id);
    });
  });

  describe('findAll', () => {
    it('should return all webhooks', async () => {
      const mockWebhooks = [{ id: '1' }, { id: '2' }];
      prismaRead.webhook.findMany.mockResolvedValue(mockWebhooks as any);

      const result = await service.findAll();

      expect(prismaRead.webhook.findMany).toHaveBeenCalled();
      expect(result.length).toBe(2);
    });
  });

  describe('findOne', () => {
    it('should return a webhook if found', async () => {
      const mockWebhooks = { id: '1' };
      prismaRead.webhook.findUnique.mockResolvedValue(mockWebhooks as any);

      const result = await service.findOne('1');

      expect(prismaRead.webhook.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result.id).toBe('1');
    });

    it('should throw NotFoundException if not found', async () => {
      prismaRead.webhook.findUnique.mockResolvedValue(null);
      await expect(service.findOne('99')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update and return a webhook', async () => {
      const mockWebhook = { id: '1', name: 'old' };
      prismaRead.webhook.findUnique.mockResolvedValue(mockWebhook as any);
      prismaWrite.webhook.update.mockResolvedValue({ id: '1', name: 'new' } as any);

      const dto: UpdateWebhookDto = { name: 'new' };
      const result = await service.update('1', dto);

      expect(prismaWrite.webhook.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { name: 'new' },
      });
      expect(result.name).toBe('new');
    });
  });

  describe('remove', () => {
    it('should logically remove a webhook', async () => {
      prismaRead.webhook.findUnique.mockResolvedValue({ id: '1' } as any);
      prismaWrite.webhook.delete.mockResolvedValue({} as any);

      await service.remove('1');

      expect(prismaWrite.webhook.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });
  });

  describe('regenerateSecret', () => {
    it('should regenerate webhook secret', async () => {
      prismaRead.webhook.findUnique.mockResolvedValue({ id: '1' } as any);
      prismaWrite.webhook.update.mockResolvedValue({} as any);

      const result = await service.regenerateSecret('1');

      expect(prismaWrite.webhook.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { secret: expect.any(String) },
      });
      expect(result.secret).toBeDefined();
    });
  });

  describe('toggleEnabled', () => {
    it('should toggle enabled status', async () => {
      prismaRead.webhook.findUnique.mockResolvedValue({ id: '1', enabled: true } as any);
      prismaWrite.webhook.update.mockResolvedValue({ id: '1', enabled: false } as any);

      const result = await service.toggleEnabled('1');

      expect(prismaWrite.webhook.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { enabled: false },
      });
      expect(result.enabled).toBe(false);
    });
  });

  describe('testWebhook', () => {
    it('should send a webhook HTTP request successfully', async () => {
      prismaRead.webhook.findUnique.mockResolvedValue({
        id: '1',
        url: 'http://test.com',
        headers: {},
      } as any);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      });

      const result = await service.testWebhook('1');

      expect(global.fetch).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
    });

    it('should return error if fetch fails', async () => {
      prismaRead.webhook.findUnique.mockResolvedValue({
        id: '1',
        url: 'http://test.com',
        headers: {},
      } as any);

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network failure'));

      const result = await service.testWebhook('1');

      expect(global.fetch).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network failure');
    });
  });
});
